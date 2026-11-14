import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  eventSponsors,
  events,
  sponsorMembers,
  sponsorshipRequests,
  sponsorshipAgreements,
  sponsorshipRequestMessages,
} from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getAuthorizedSponsorshipRequest } from "@/lib/sponsorship-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const requestedAction = ["accept", "counter", "decline"].includes(body.action) ? body.action as "accept" | "counter" | "decline" : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (!requestedAction) return NextResponse.json({ error: "Choose accept, counter, or decline." }, { status: 400 });
  if (requestedAction !== "accept" && note.length < 10) return NextResponse.json({ error: "Add a reason or counteroffer of at least 10 characters." }, { status: 400 });

  const [record] = await db
    .select({
      id: sponsorshipRequests.id,
      eventId: sponsorshipRequests.eventId,
      sponsorId: sponsorshipRequests.sponsorId,
      targetMemberId: sponsorshipRequests.targetMemberId,
      requesterMemberId: sponsorshipRequests.requesterMemberId,
      responseMemberId: sponsorshipRequests.responseMemberId,
      eventOwnerId: events.ownerId,
      contributionType: sponsorshipRequests.contributionType,
      cashAmountCents: sponsorshipRequests.cashAmountCents,
      message: sponsorshipRequests.message,
      offerDetails: sponsorshipRequests.offerDetails,
      flightIncluded: sponsorshipRequests.flightIncluded,
      hotelIncluded: sponsorshipRequests.hotelIncluded,
      representationRequired: sponsorshipRequests.representationRequired,
      representationTerms: sponsorshipRequests.representationTerms,
    })
    .from(sponsorshipRequests)
    .innerJoin(events, eq(sponsorshipRequests.eventId, events.id))
    .where(and(eq(sponsorshipRequests.id, id), inArray(sponsorshipRequests.status, ["pending", "countered"])))
    .limit(1);
  if (!record) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  if (!(await getAuthorizedSponsorshipRequest(record.id, member.id))) {
    return NextResponse.json({ error: "You cannot manage this request." }, { status: 403 });
  }
  if ((record.responseMemberId ?? record.requesterMemberId) === member.id) return NextResponse.json({ error: "Waiting for the other party to respond." }, { status: 409 });

  const status = requestedAction === "accept" ? "accepted" : requestedAction === "counter" ? "countered" : "declined";

  await db.transaction(async (transaction) => {
    await transaction
      .update(sponsorshipRequests)
      .set({ status, responseNote: note, responseMemberId: member.id, respondedAt: new Date(), updatedAt: new Date() })
      .where(eq(sponsorshipRequests.id, record.id));
    if (note) await transaction.insert(sponsorshipRequestMessages).values({ requestId: record.id, senderMemberId: member.id, senderName: member.name, body: `${requestedAction === "counter" ? "Counteroffer" : "Declined"}: ${note}` });
    if (status === "accepted") {
      const [sponsorMember] = await transaction.select({ memberId: sponsorMembers.memberId }).from(sponsorMembers).where(eq(sponsorMembers.sponsorId, record.sponsorId)).limit(1);
      await transaction.insert(sponsorshipAgreements).values({
        requestId: record.id,
        organizerMemberId: record.eventOwnerId,
        sponsorMemberId: sponsorMember?.memberId,
        beneficiaryMemberId: record.targetMemberId,
        terms: [
          record.message,
          record.offerDetails && `Offer details: ${record.offerDetails}`,
          record.flightIncluded && "Travel: Round-trip flight included.",
          record.hotelIncluded && "Travel: Hotel accommodation included.",
          record.representationRequired && `Representation terms: ${record.representationTerms}`,
        ].filter(Boolean).join("\n\n"),
        cashAmountCents: record.cashAmountCents,
        contributionType: record.contributionType,
        paymentStatus: ["cash", "hybrid"].includes(record.contributionType) && record.cashAmountCents > 0 ? "pending" : "not_required",
        inKindStatus: ["in_kind", "hybrid"].includes(record.contributionType) ? "pending" : "not_required",
      }).onConflictDoNothing({ target: sponsorshipAgreements.requestId });
      await transaction
        .insert(eventSponsors)
        .values({
          eventId: record.eventId,
          sponsorId: record.sponsorId,
          level: "Agreement pending",
          contribution: "Accepted offer; final agreement and fulfillment are pending.",
        })
        .onConflictDoUpdate({
          target: [eventSponsors.eventId, eventSponsors.sponsorId],
          set: { level: "Agreement pending", contribution: "Accepted offer; final agreement and fulfillment are pending." },
        });
    }
  });
  return NextResponse.json({ ok: true });
}
