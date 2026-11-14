import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { systemAlerts } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const [alert] = await db
    .update(systemAlerts)
    .set({ status: "acknowledged", acknowledgedAt: new Date(), acknowledgedBy: admin.id })
    .where(and(eq(systemAlerts.id, id), eq(systemAlerts.status, "open")))
    .returning();
  if (!alert) return Response.json({ error: "Alert is no longer open." }, { status: 409 });
  return Response.json({ alert });
}
