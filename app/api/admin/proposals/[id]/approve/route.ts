import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventProposals, events } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { publishedEventValues } from "@/lib/publish-event";
import { assertEventCapacity } from "@/lib/entitlements";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  try {
    const proposalId = (await params).id;
    const [proposal] = await db
      .select()
      .from(eventProposals)
      .where(eq(eventProposals.id, proposalId))
      .limit(1);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
    }
    if (proposal.status === "approved") {
      return NextResponse.json({ error: "This proposal is already approved." }, { status: 409 });
    }
    if (proposal.memberId && proposal.role === "host") {
      const capacityCheck = await assertEventCapacity(proposal.memberId, proposal.id);
      if (!capacityCheck.ok) {
        return NextResponse.json({ error: capacityCheck.error }, { status: 409 });
      }
    }
    const [event] = await db.transaction(async (transaction) => {
      const created = await transaction
        .insert(events)
        .values(publishedEventValues(proposal))
        .returning({ id: events.id, slug: events.slug });
      await transaction
        .update(eventProposals)
        .set({ status: "approved", eventId: created[0].id, rejectionReason: "", updatedAt: new Date() })
        .where(eq(eventProposals.id, proposal.id));
      return created;
    });
    await recordAdminAudit({ adminId: admin.id, action: "approve", resourceType: "event_proposal", resourceId: proposalId, beforeData: proposal as unknown as Record<string, unknown>, afterData: { status: "approved", eventId: event.id } });
    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "An event already exists for this proposal." }, { status: 409 });
    }
    console.error("Proposal approval failed", error);
    return NextResponse.json({ error: "Could not approve the proposal." }, { status: 500 });
  }
}
