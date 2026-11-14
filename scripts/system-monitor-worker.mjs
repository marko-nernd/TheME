import nodemailer from "nodemailer";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL,
  max: 2,
});
const mail = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "mailpit",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
});
const metricsUrl =
  process.env.APPLICATION_METRICS_URL ?? "http://application:3000/api/internal/metrics";
const monitorSecret = process.env.MONITOR_SECRET;
const alertEmail = process.env.ALERT_EMAIL ?? "admin@modelescape.local";
const from = process.env.EMAIL_FROM ?? "Model Escape <verify@modelescape.local>";
const intervalMs = Math.max(15_000, Number(process.env.MONITOR_INTERVAL_MS ?? 60_000));
const requiredSamples = Math.max(1, Number(process.env.MONITOR_REQUIRED_SAMPLES ?? 3));
const consecutive = new Map();

const rules = [
  {
    metric: "cpu",
    field: "cpuPercent",
    label: "Application CPU",
    threshold: Number(process.env.MONITOR_CPU_THRESHOLD ?? 85),
    suffix: "%",
  },
  {
    metric: "memory",
    field: "memoryPercent",
    label: "Application memory",
    threshold: Number(process.env.MONITOR_MEMORY_THRESHOLD ?? 85),
    suffix: "%",
  },
  {
    metric: "storage",
    field: "storageUsedMb",
    label: "Web app storage",
    threshold: Number(process.env.MONITOR_APP_STORAGE_THRESHOLD_MB ?? 2048),
    suffix: " MB",
  },
  {
    metric: "database",
    field: "databaseLatencyMs",
    label: "Database latency",
    threshold: Number(process.env.MONITOR_DATABASE_LATENCY_THRESHOLD ?? 1000),
    suffix: " ms",
  },
  {
    metric: "response",
    field: "responseTimeMs",
    label: "Heartbeat response",
    threshold: Number(process.env.MONITOR_RESPONSE_TIME_THRESHOLD ?? 2000),
    suffix: " ms",
  },
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

async function sendAlertEmail({ title, message, recovered = false }) {
  await mail.sendMail({
    from,
    to: alertEmail,
    subject: `${recovered ? "Resolved" : "Alert"}: ${title}`,
    text: `${message}\n\nOpen the Model Escape admin System tab for details.`,
    html: `<div style="font-family:Montserrat,Arial,sans-serif;background:#11110f;color:#fff;padding:40px">
      <p style="color:#ff2d95;font-weight:800;letter-spacing:2px">MODEL ESCAPE · SYSTEM</p>
      <h1>${escapeHtml(title)}</h1>
      <p style="color:#c9c7c0;line-height:1.7">${escapeHtml(message)}</p>
    </div>`,
  });
}

async function openOrUpdateAlert(rule, value, message) {
  const active = await pool.query(
    `select id, status from system_alerts
      where metric = $1 and status in ('open', 'acknowledged')
      order by last_triggered_at desc limit 1`,
    [rule.metric],
  );
  const severity = value >= rule.threshold * 1.15 ? "critical" : "warning";
  if (active.rowCount) {
    await pool.query(
      `update system_alerts
          set current_value = $2, threshold = $3, severity = $4,
              message = $5, last_triggered_at = now()
        where id = $1`,
      [active.rows[0].id, value, rule.threshold, severity, message],
    );
    return;
  }
  await pool.query(
    `insert into system_alerts
      (metric, severity, title, message, current_value, threshold)
      values ($1, $2, $3, $4, $5, $6)`,
    [rule.metric, severity, `${rule.label} is high`, message, value, rule.threshold],
  );
  await sendAlertEmail({ title: `${rule.label} is high`, message }).catch((error) =>
    console.error("Could not send system alert email", error),
  );
}

async function resolveAlert(metric, label) {
  const result = await pool.query(
    `update system_alerts
        set status = 'resolved', resolved_at = now(), last_triggered_at = now()
      where metric = $1 and status in ('open', 'acknowledged')
      returning id`,
    [metric],
  );
  if (result.rowCount) {
    await sendAlertEmail({
      title: `${label} recovered`,
      message: `${label} is back within its configured threshold.`,
      recovered: true,
    }).catch((error) => console.error("Could not send recovery email", error));
  }
}

async function evaluateMetrics(metrics) {
  await resolveAlert("availability", "Application heartbeat");
  for (const rule of rules) {
    const value = Number(metrics[rule.field]);
    if (!Number.isFinite(value)) continue;
    if (value >= rule.threshold) {
      const samples = (consecutive.get(rule.metric) ?? 0) + 1;
      consecutive.set(rule.metric, samples);
      if (samples >= requiredSamples) {
        await openOrUpdateAlert(
          rule,
          Math.round(value),
          `${rule.label} is ${Math.round(value)}${rule.suffix}; the alert threshold is ${rule.threshold}${rule.suffix}.`,
        );
      }
    } else {
      consecutive.set(rule.metric, 0);
      await resolveAlert(rule.metric, rule.label);
    }
  }
}

async function recordHealthy(metrics) {
  await pool.query(
    `insert into system_heartbeats
      (status, cpu_percent, memory_used_mb, memory_limit_mb, memory_percent,
       storage_used_mb, storage_total_mb, storage_percent, database_latency_ms,
       response_time_ms, uptime_seconds, detail, recorded_at)
      values ('healthy', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      metrics.cpuPercent,
      metrics.memoryUsedMb,
      metrics.memoryLimitMb,
      metrics.memoryPercent,
      metrics.storageUsedMb,
      metrics.storageTotalMb,
      metrics.storagePercent,
      metrics.databaseLatencyMs,
      metrics.responseTimeMs,
      metrics.uptimeSeconds,
      `Application files ${metrics.appFilesMb} MB · PostgreSQL ${metrics.databaseMb} MB`,
      metrics.recordedAt,
    ],
  );
}

async function recordFailure(error) {
  const detail = error instanceof Error ? error.message.slice(0, 500) : "Heartbeat request failed";
  await pool.query(
    "insert into system_heartbeats (status, detail) values ('unreachable', $1)",
    [detail],
  );
  const samples = (consecutive.get("availability") ?? 0) + 1;
  consecutive.set("availability", samples);
  if (samples >= requiredSamples) {
    await openOrUpdateAlert(
      {
        metric: "availability",
        label: "Application heartbeat",
        threshold: requiredSamples,
        suffix: " failed samples",
      },
      samples,
      `The application heartbeat failed ${samples} consecutive times. ${detail}`,
    );
  }
}

export async function runHeartbeat() {
  try {
    if (!monitorSecret) throw new Error("MONITOR_SECRET is not configured");
    const response = await fetch(metricsUrl, {
      headers: { authorization: `Bearer ${monitorSecret}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Metrics endpoint returned HTTP ${response.status}`);
    const metrics = await response.json();
    await recordHealthy(metrics);
    consecutive.set("availability", 0);
    await evaluateMetrics(metrics);
    console.log(
      `Heartbeat healthy: CPU ${metrics.cpuPercent}%, memory ${metrics.memoryPercent}%, web app storage ${metrics.storageUsedMb} MB.`,
    );
  } catch (error) {
    console.error("Heartbeat failed", error);
    await recordFailure(error);
  }
  await pool.query("delete from system_heartbeats where recorded_at < now() - interval '30 days'");
}

try {
  await runHeartbeat();
  if (process.argv.includes("--once")) {
    await pool.end();
  } else {
    setInterval(() => {
      runHeartbeat().catch((error) => console.error("System monitor sweep failed", error));
    }, intervalMs);
  }
} catch (error) {
  console.error("System monitor failed", error);
  await pool.end();
  process.exit(1);
}
