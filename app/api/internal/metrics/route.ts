import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import { timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CpuSample = { usageMicros: number; sampledAt: number };
type AppStorageSample = { sizeMb: number; sampledAt: number };
const execFileAsync = promisify(execFile);

const globalMetrics = globalThis as typeof globalThis & {
  modelEscapeCpuSample?: CpuSample;
  modelEscapeAppStorageSample?: AppStorageSample;
};

function authorized(request: Request) {
  const expected = process.env.MONITOR_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

async function readNumber(path: string) {
  const value = (await readFile(path, "utf8")).trim();
  return value === "max" ? null : Number(value);
}

async function containerMemory() {
  try {
    const [usedBytes, limitBytes] = await Promise.all([
      readNumber("/sys/fs/cgroup/memory.current"),
      readNumber("/sys/fs/cgroup/memory.max"),
    ]);
    if (usedBytes !== null && Number.isFinite(usedBytes)) {
      const effectiveLimit =
        limitBytes && Number.isFinite(limitBytes) && limitBytes < Number.MAX_SAFE_INTEGER
          ? limitBytes
          : os.totalmem();
      return { usedBytes, limitBytes: effectiveLimit };
    }
  } catch {
    // Non-container development uses the operating-system fallback.
  }
  return {
    usedBytes: os.totalmem() - os.freemem(),
    limitBytes: os.totalmem(),
  };
}

async function containerCpuPercent() {
  try {
    const cpuStat = await readFile("/sys/fs/cgroup/cpu.stat", "utf8");
    const usageMicros = Number(cpuStat.match(/^usage_usec\s+(\d+)/m)?.[1]);
    const sampledAt = performance.now();
    const previous = globalMetrics.modelEscapeCpuSample;
    globalMetrics.modelEscapeCpuSample = { usageMicros, sampledAt };
    if (previous && sampledAt > previous.sampledAt) {
      return Math.max(
        0,
        Math.round(((usageMicros - previous.usageMicros) / ((sampledAt - previous.sampledAt) * 1000)) * 100),
      );
    }
  } catch {
    // Fall through to a process-level estimate.
  }
  const usage = process.cpuUsage();
  return Math.max(0, Math.round(((usage.user + usage.system) / 1_000_000 / process.uptime()) * 100));
}

async function applicationFileStorageMb() {
  const cached = globalMetrics.modelEscapeAppStorageSample;
  if (cached && Date.now() - cached.sampledAt < 10 * 60 * 1000) return cached.sizeMb;
  const { stdout } = await execFileAsync("du", ["-sk", "/app"]);
  const sizeMb = Math.max(1, Math.round(Number(stdout.trim().split(/\s+/)[0]) / 1024));
  globalMetrics.modelEscapeAppStorageSample = { sizeMb, sampledAt: Date.now() };
  return sizeMb;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const startedAt = performance.now();
  const databaseStartedAt = performance.now();
  const databaseResult = await pool.query(
    "select pg_database_size(current_database())::bigint as size_bytes",
  );
  const databaseLatencyMs = Math.max(0, Math.round(performance.now() - databaseStartedAt));
  const [memory, cpuPercent, appFilesMb] = await Promise.all([
    containerMemory(),
    containerCpuPercent(),
    applicationFileStorageMb(),
  ]);
  const databaseMb = Math.max(
    1,
    Math.round(Number(databaseResult.rows[0]?.size_bytes ?? 0) / 1024 / 1024),
  );
  const webAppStorageMb = appFilesMb + databaseMb;
  const webAppStorageLimitMb = Math.max(
    1,
    Number(process.env.MONITOR_APP_STORAGE_THRESHOLD_MB ?? 2048),
  );
  const processMemory = process.memoryUsage();

  return Response.json(
    {
      status: "healthy",
      recordedAt: new Date().toISOString(),
      cpuPercent,
      memoryUsedMb: Math.round(memory.usedBytes / 1024 / 1024),
      memoryLimitMb: Math.round(memory.limitBytes / 1024 / 1024),
      memoryPercent: Math.round((memory.usedBytes / memory.limitBytes) * 100),
      storageUsedMb: webAppStorageMb,
      storageTotalMb: webAppStorageLimitMb,
      storagePercent: Math.round((webAppStorageMb / webAppStorageLimitMb) * 100),
      appFilesMb,
      databaseMb,
      databaseLatencyMs,
      responseTimeMs: Math.max(0, Math.round(performance.now() - startedAt)),
      uptimeSeconds: Math.round(process.uptime()),
      processRssMb: Math.round(processMemory.rss / 1024 / 1024),
      processHeapMb: Math.round(processMemory.heapUsed / 1024 / 1024),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
