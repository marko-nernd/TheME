import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const body = await request.json();
  // The original diagnostic used Math.min(300); the controlled cap is now 1,000.
  const users = Math.max(1, Math.min(1000, Math.floor(Number(body.users) || 1)));
  const requestsPerUser = Math.max(1, Math.min(4, Math.floor(Number(body.requestsPerUser) || 2)));
  const requestedPath = typeof body.path === "string" ? body.path : "/api/health";
  const allowedPaths = new Set(["/api/health", "/events", "/models", "/discover"]);
  const path = allowedPaths.has(requestedPath) ? requestedPath : "/api/health";
  // Default route remains http://127.0.0.1:3000/api/health for compatibility with the local monitor.
  const target = new URL(path, "http://127.0.0.1:3000").toString();
  const stress = body.mode === "stress";
  const durationSeconds = stress ? Math.max(5, Math.min(30, Math.floor(Number(body.durationSeconds) || 30))) : 0;
  const stressPaths = ["/api/health", "/events", "/models", "/discover"];
  const startedAt = Date.now();
  const latencies: number[] = [];
  let failures = 0;
  const timeline: Array<{ second: number; requests: number; failures: number; averageMs: number; p95Ms: number }> = [];
  const deadline = stress ? startedAt + durationSeconds * 1000 : startedAt;
  let cycle = 0;
  do {
    const cycleStarted = Date.now();
    const cycleLatencies: number[] = [];
    let cycleFailures = 0;
    await Promise.all(Array.from({ length: users }, async () => {
      const count = stress ? 1 : requestsPerUser;
      for (let requestNumber = 0; requestNumber < count; requestNumber += 1) {
        if (stress && Date.now() >= deadline) break;
      const started = performance.now();
      try {
        const requestTarget = stress
          ? new URL(stressPaths[Math.floor(Math.random() * stressPaths.length)], "http://127.0.0.1:3000").toString()
          : target;
        const response = await fetch(requestTarget, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) { failures += 1; cycleFailures += 1; }
      } catch {
        failures += 1; cycleFailures += 1;
      }
        const latency = performance.now() - started;
        latencies.push(latency); cycleLatencies.push(latency);
      }
    }));
    if (stress) {
      cycleLatencies.sort((a, b) => a - b);
      timeline.push({ second: Math.max(1, Math.ceil((Date.now() - startedAt) / 1000)), requests: cycleLatencies.length, failures: cycleFailures, averageMs: Math.round(cycleLatencies.reduce((sum, value) => sum + value, 0) / Math.max(1, cycleLatencies.length)), p95Ms: Math.round(cycleLatencies[Math.min(cycleLatencies.length - 1, Math.floor(cycleLatencies.length * .95))] ?? 0) });
      if (Date.now() - cycleStarted < 25) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    cycle += 1;
  } while (stress && Date.now() < deadline);
  latencies.sort((a, b) => a - b);
  const percentile = (value: number) => Math.round(latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] ?? 0);
  const totalRequests = latencies.length;
  const failureRate = totalRequests ? failures / totalRequests : 1;
  const p95 = percentile(.95);
  const grade = failureRate === 0 && p95 < 250 ? "A" : failureRate < .01 && p95 < 500 ? "B" : failureRate < .05 && p95 < 1000 ? "C" : failureRate < .1 ? "D" : "F";
  return NextResponse.json({
    users,
    requests: totalRequests,
    path,
    failures,
    durationMs: Date.now() - startedAt,
    averageMs: Math.round(latencies.reduce((total, latency) => total + latency, 0) / Math.max(1, latencies.length)),
    p50Ms: percentile(.5),
    p95Ms: p95,
    p99Ms: percentile(.99),
    grade,
    failureRate: Number((failureRate * 100).toFixed(2)),
    mode: stress ? "30-second randomized stress" : "quick route test",
    timeline,
    note: "Local diagnostic from the admin container; randomized stress tests are capped at 30 seconds. Grades are heuristic: A requires zero failures and P95 below 250ms.",
  });
}
