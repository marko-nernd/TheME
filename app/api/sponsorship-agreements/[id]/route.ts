import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sponsorshipAgreements } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { completeSponsorshipIfReady } from "@/lib/sponsorship-payments";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember(); if (!member) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params; const body = await request.json();
  const [agreement] = await db.select().from(sponsorshipAgreements).where(and(eq(sponsorshipAgreements.id, id), or(eq(sponsorshipAgreements.organizerMemberId, member.id), eq(sponsorshipAgreements.sponsorMemberId, member.id), eq(sponsorshipAgreements.beneficiaryMemberId, member.id)))).limit(1);
  if (!agreement) return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  const action = ["accept_terms", "mark_delivered", "confirm_delivery"].includes(body.action) ? body.action : "accept_terms";
  const terms = typeof body.terms === "string" ? body.terms.trim().slice(0, 5000) : agreement.terms;
  const now = new Date();
  if (action === "mark_delivered") {
    if (agreement.sponsorMemberId !== member.id || !["confirmed", "completed"].includes(agreement.status) || agreement.inKindStatus === "not_required") return NextResponse.json({ error: "Only the sponsor can mark this contribution delivered after the agreement is confirmed." }, { status: 403 });
    const fulfillmentNotes = typeof body.fulfillmentNotes === "string" ? body.fulfillmentNotes.trim().slice(0, 3000) : "";
    if (fulfillmentNotes.length < 10) return NextResponse.json({ error: "Add delivery details of at least 10 characters." }, { status: 400 });
    await db.update(sponsorshipAgreements).set({ fulfillmentNotes, inKindStatus: "delivered", sponsorDeliveredAt: now, recipientConfirmedAt: null, updatedAt: now }).where(eq(sponsorshipAgreements.id, id));
    return NextResponse.json({ ok: true });
  }
  if (action === "confirm_delivery") {
    if ((agreement.organizerMemberId !== member.id && agreement.beneficiaryMemberId !== member.id) || agreement.inKindStatus !== "delivered") return NextResponse.json({ error: "The receiving host or sponsored member must confirm a delivered contribution." }, { status: 403 });
    await db.update(sponsorshipAgreements).set({ inKindStatus: "confirmed", recipientConfirmedAt: now, updatedAt: now }).where(eq(sponsorshipAgreements.id, id));
    await completeSponsorshipIfReady(id);
    return NextResponse.json({ ok: true });
  }
  const organizerAcceptedAt = agreement.organizerMemberId === member.id ? now : agreement.organizerAcceptedAt;
  const sponsorAcceptedAt = agreement.sponsorMemberId === member.id ? now : agreement.sponsorAcceptedAt;
  const beneficiaryAcceptedAt = agreement.beneficiaryMemberId === member.id ? now : agreement.beneficiaryAcceptedAt;
  const beneficiaryComplete = !agreement.beneficiaryMemberId || Boolean(beneficiaryAcceptedAt);
  await db.update(sponsorshipAgreements).set({ terms, organizerAcceptedAt, sponsorAcceptedAt, beneficiaryAcceptedAt, status: organizerAcceptedAt && sponsorAcceptedAt && beneficiaryComplete ? "confirmed" : "awaiting_acceptance", updatedAt: now }).where(eq(sponsorshipAgreements.id, id));
  if (organizerAcceptedAt && sponsorAcceptedAt && beneficiaryComplete) await completeSponsorshipIfReady(id);
  return NextResponse.json({ ok: true });
}
