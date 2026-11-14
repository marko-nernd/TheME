import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventProposals } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const body = await request.json();
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1200) : "";
  if (!reason) return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  const proposalId = (await params).id;
  const [before] = await db.select().from(eventProposals).where(eq(eventProposals.id, proposalId)).limit(1);
  const [proposal] = await db.update(eventProposals)
    .set({ status: "rejected", rejectionReason: reason, updatedAt: new Date() })
    .where(eq(eventProposals.id, proposalId))
    .returning({ id: eventProposals.id });
  if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  const admin = await getCurrentAdmin();
  if (admin) await recordAdminAudit({ adminId: admin.id, action: "reject", resourceType: "event_proposal", resourceId: proposalId, beforeData: before as unknown as Record<string, unknown>, afterData: { status: "rejected", rejectionReason: reason } });
  return NextResponse.json({ ok: true });
}
