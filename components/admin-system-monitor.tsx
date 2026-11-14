"use client";

import { useCallback, useEffect, useState } from "react";

type Heartbeat = {
  id: string;
  status: string;
  cpuPercent: number | null;
  memoryUsedMb: number | null;
  memoryLimitMb: number | null;
  memoryPercent: number | null;
  storageUsedMb: number | null;
  storageTotalMb: number | null;
  storagePercent: number | null;
  databaseLatencyMs: number | null;
  responseTimeMs: number | null;
  detail: string;
  recordedAt: string;
};

type SystemAlert = {
  id: string;
  metric: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  lastTriggeredAt: string;
  resolvedAt: string | null;
};

type LoadTimelinePoint = { second: number; requests: number; failures: number; averageMs: number; p95Ms: number };
type LoadResult = {
  error?: string;
  requests?: number;
  failures?: number;
  averageMs?: number;
  p95Ms?: number;
  durationMs?: number;
  grade?: string;
  failureRate?: number;
  mode?: string;
  timeline?: LoadTimelinePoint[];
};

const thresholds = {
  cpu: 85,
  memory: 85,
  storage: 2048,
  database: 1000,
};

function MetricCard({
  label,
  value,
  suffix,
  threshold,
  detail,
  displayValue,
}: {
  label: string;
  value: number | null;
  suffix: string;
  threshold: number;
  detail: string;
  displayValue?: string;
}) {
  const percentage = value === null ? 0 : Math.min(100, suffix === "%" ? value : (value / threshold) * 100);
  const high = value !== null && value >= threshold;
  return (
    <article className={high ? "is-high" : ""}>
      <div><span>{label}</span><b>{high ? "High" : "Normal"}</b></div>
      <strong>{value === null ? "—" : displayValue ?? `${value}${suffix}`}</strong>
      <div className="monitor-meter" aria-label={`${label}: ${value ?? "not available"}${suffix}`}>
        <i style={{ width: `${percentage}%` }} />
      </div>
      <small>{detail} · alert at {threshold >= 1024 && suffix.trim() === "MB" ? `${(threshold / 1024).toFixed(1)} GB` : `${threshold}${suffix}`}</small>
    </article>
  );
}

export default function AdminSystemMonitor() {
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sampledNow, setSampledNow] = useState<number | null>(null);
  const [rangeHours, setRangeHours] = useState(1);
  const [loadUsers, setLoadUsers] = useState(25);
  const [loadRequests, setLoadRequests] = useState(2);
  const [loadPath, setLoadPath] = useState("/api/health");
  const [loadTesting, setLoadTesting] = useState(false);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/system-status?hours=${rangeHours}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the heartbeat.");
      const data = await response.json();
      setHeartbeats(data.heartbeats);
      setAlerts(data.alerts);
      setSampledNow(Date.now());
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not load the heartbeat.");
    } finally {
      setLoading(false);
    }
  }, [rangeHours]);

  useEffect(() => {
    const initialTimer = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function acknowledge(id: string) {
    const response = await fetch(`/api/admin/system-alerts/${id}`, { method: "PATCH" });
    if (response.ok) await refresh();
  }

  async function runLoadTest() {
    setLoadTesting(true);
    setLoadResult(null);
    const response = await fetch("/api/admin/load-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ users: loadUsers, requestsPerUser: loadRequests, path: loadPath }),
    });
    const result = await response.json();
    setLoadResult(response.ok ? result : { error: result.error || "Load test failed." });
    setLoadTesting(false);
    await refresh();
  }

  async function runStressTest() {
    setLoadTesting(true);
    setLoadResult(null);
    const response = await fetch("/api/admin/load-test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ users: loadUsers, mode: "stress", durationSeconds: 30 }) });
    const result = await response.json();
    setLoadResult(response.ok ? result : { error: result.error || "Stress test failed." });
    setLoadTesting(false);
    await refresh();
  }

  const latest = heartbeats[0];
  const activeAlerts = alerts.filter((alert) => alert.status !== "resolved");
  const latestAge = latest && sampledNow !== null
    ? Math.max(0, Math.round((sampledNow - new Date(latest.recordedAt).getTime()) / 1000))
    : null;
  const healthy = latest?.status === "healthy" && latestAge !== null && latestAge < 180;
  const chartPoints = [...heartbeats].reverse().filter((item) => item.cpuPercent !== null);
  const cpuPath = chartPoints.map((item, index) => {
    const x = chartPoints.length <= 1 ? 0 : (index / (chartPoints.length - 1)) * 100;
    const y = 100 - Math.max(0, Math.min(100, item.cpuPercent ?? 0));
    return `${index ? "L" : "M"} ${x} ${y}`;
  }).join(" ");

  return (
    <section className="system-monitor" aria-live="polite">
      <div className="monitor-summary">
        <div>
          <p className="astryx-kicker">LIVE HEARTBEAT</p>
          <h3>{loading ? "Connecting…" : healthy ? "All monitored systems normal" : "Heartbeat needs attention"}</h3>
          <p>
            {latest
              ? `Last checked ${new Date(latest.recordedAt).toLocaleString()} · ${latestAge} seconds ago · refreshes every 30 seconds`
              : "Waiting for the first monitor sample."}
          </p>
        </div>
        <span className={healthy ? "monitor-status is-healthy" : "monitor-status is-warning"}>
          {healthy ? "Operational" : "Check monitor"}
        </span>
      </div>
      {error && <p className="monitor-error">{error}</p>}
      <div className="monitor-metrics">
        <MetricCard label="CPU" value={latest?.cpuPercent ?? null} suffix="%" threshold={thresholds.cpu} detail="Application container" />
        <MetricCard
          label="Memory"
          value={latest?.memoryPercent ?? null}
          suffix="%"
          threshold={thresholds.memory}
          detail={latest?.memoryUsedMb ? `${latest.memoryUsedMb} of ${latest.memoryLimitMb} MB` : "Application container"}
        />
        <MetricCard
          label="Web app storage"
          value={latest?.storageUsedMb ?? null}
          suffix=" MB"
          threshold={latest?.storageTotalMb ?? thresholds.storage}
          displayValue={latest?.storageUsedMb
            ? latest.storageUsedMb >= 1024
              ? `${(latest.storageUsedMb / 1024).toFixed(2)} GB`
              : `${latest.storageUsedMb} MB`
            : undefined}
          detail={latest?.detail || "Application files plus PostgreSQL database"}
        />
        <MetricCard label="Database" value={latest?.databaseLatencyMs ?? null} suffix=" ms" threshold={thresholds.database} detail="PostgreSQL response" />
      </div>
      <div className="monitor-history">
        <div>
          <strong>Recent heartbeat</strong>
          <span>Newest on the left · 60 checks retained here</span>
        </div>
        <div className="monitor-pulse-row">
          {heartbeats.map((heartbeat) => (
            <i
              key={heartbeat.id}
              className={heartbeat.status === "healthy" ? "" : "is-failed"}
              title={`${new Date(heartbeat.recordedAt).toLocaleString()} · ${heartbeat.status}`}
            />
          ))}
        </div>
      </div>
      <div className="monitor-cpu-chart">
        <div>
          <strong>CPU usage</strong>
          <nav className="admin-subtabs" aria-label="CPU chart range">
            {[1, 6, 12, 24].map((hours) => <button type="button" className={rangeHours === hours ? "is-active" : ""} onClick={() => setRangeHours(hours)} key={hours}>{hours} hour{hours === 1 ? "" : "s"}</button>)}
          </nav>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`CPU usage over ${rangeHours} hours`}>
          <line x1="0" y1="15" x2="100" y2="15" />
          {cpuPath && <path d={cpuPath} />}
        </svg>
        <div><span>100%</span><span>Alert 85%</span><span>0%</span></div>
      </div>
      <div className="monitor-alerts">
        <div><strong>System alerts</strong><span>{activeAlerts.length} active</span></div>
        {alerts.length ? alerts.slice(0, 10).map((alert) => (
          <article key={alert.id} className={`alert-${alert.status}`}>
            <div>
              <b>{alert.title}</b>
              <p>{alert.message}</p>
              <small>{new Date(alert.lastTriggeredAt).toLocaleString()} · {alert.severity}</small>
            </div>
            {alert.status === "open" ? (
              <button type="button" onClick={() => acknowledge(alert.id)}>Acknowledge</button>
            ) : <span>{alert.status}</span>}
          </article>
        )) : <p className="monitor-empty">No alerts have been recorded.</p>}
      </div>
      <div className="admin-load-test">
        <div><p className="astryx-kicker">LOCAL LOAD TEST</p><h3>Measure application response under controlled concurrency.</h3><p>This diagnostic tests local routes only. Run a quick route check or a randomized 30-second stress timeline.</p></div>
        <div>
          <label>Simulated users<input type="number" min={1} max={1000} value={loadUsers} onChange={(event) => setLoadUsers(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))} /></label>
          <label>Requests per user<input type="number" min={1} max={4} value={loadRequests} onChange={(event) => setLoadRequests(Math.max(1, Math.min(4, Number(event.target.value) || 1)))} /></label>
          <label>Route<select value={loadPath} onChange={(event) => setLoadPath(event.target.value)}><option value="/api/health">Health endpoint</option><option value="/events">Events page</option><option value="/models">Models page</option><option value="/discover">Discover page</option></select></label>
          <div className="load-test-buttons"><button className="button" type="button" disabled={loadTesting} onClick={runLoadTest}>{loadTesting ? "Running test…" : "Quick test ↗"}</button><button className="button button-dark" type="button" disabled={loadTesting} onClick={runStressTest}>{loadTesting ? "Testing for 30 seconds…" : "30-second stress test ↗"}</button></div>
        </div>
        {loadResult && <dl>
          {loadResult.error ? <div><dt>Error</dt><dd>{loadResult.error}</dd></div> : <>
            <div><dt>Grade</dt><dd className={`load-grade grade-${loadResult.grade?.toLowerCase()}`}>{loadResult.grade}</dd></div>
            <div><dt>Requests</dt><dd>{loadResult.requests}</dd></div>
            <div><dt>Failures</dt><dd>{loadResult.failures} ({loadResult.failureRate}%)</dd></div>
            <div><dt>Average / P95</dt><dd>{loadResult.averageMs} / {loadResult.p95Ms} ms</dd></div>
            <div><dt>Total time</dt><dd>{loadResult.durationMs} ms</dd></div>
          </>}
        </dl>}
        {loadResult?.timeline && loadResult.timeline.length > 0 && <div className="load-test-timeline"><strong>Stress timeline · requests and P95 latency by second</strong><svg viewBox="0 0 100 42" preserveAspectRatio="none" role="img" aria-label="Thirty second stress timeline"><polyline points={loadResult.timeline.map((point, index) => `${(index / Math.max(1, loadResult.timeline!.length - 1)) * 100},${42 - Math.min(38, point.p95Ms / 50)}`).join(" ")} /></svg><div><span>Start</span><span>Higher P95 latency ↑</span><span>30 sec</span></div></div>}
      </div>
    </section>
  );
}
