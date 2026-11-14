import { desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { systemAlerts, systemHeartbeats } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const requestedHours = Number(new URL(request.url).searchParams.get("hours") ?? 1);
  const hours = [1, 6, 12, 24].includes(requestedHours) ? requestedHours : 1;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const [heartbeats, alerts] = await Promise.all([
    db.select().from(systemHeartbeats).where(gte(systemHeartbeats.recordedAt, since)).orderBy(desc(systemHeartbeats.recordedAt)).limit(1440),
    db.select().from(systemAlerts).orderBy(desc(systemAlerts.lastTriggeredAt)).limit(50),
  ]);
  return Response.json({ heartbeats, alerts, hours }, { headers: { "cache-control": "no-store" } });
}
