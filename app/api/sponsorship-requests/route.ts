import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  members,
  sponsorMembers,
  sponsors,
  sponsorshipRequests,
  sponsorshipRequestMessages,
} from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { sendSponsorshipNotice } from "@/lib/email";
import { assertSponsorOutreachCapacity } from "@/lib/entitlements";

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in with a verified account first." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const targetMemberId = typeof body.targetMemberId === "string" ? body.targetMemberId : null;
    const sponsorId = typeof body.sponsorId === "string" ? body.sponsorId : "";
    const direction =
      body.direction === "promoter_to_sponsor"
        ? "promoter_to_sponsor"
        : body.direction === "sponsor_to_member"
          ? "sponsor_to_member"
        : "sponsor_to_event";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const contributionType = ["cash", "in_kind", "hybrid"].includes(String(body.contributionType)) ? String(body.contributionType) : "in_kind";
    const cashAmountCents = Math.max(0, Math.min(100_000_000, Math.round(Number(body.cashAmountDollars || 0) * 100)));
    const offerDetails = typeof body.offerDetails === "string" ? body.offerDetails.trim().slice(0, 1200) : "";
    const flightIncluded = body.flightIncluded === true;
    const hotelIncluded = body.hotelIncluded === true;
    const representationRequired = body.representationRequired === true;
    const representationTerms = typeof body.representationTerms === "string" ? body.representationTerms.trim().slice(0, 2000) : "";
    if (message.length < 20 || message.length > 2000) {
      return NextResponse.json({ error: "Enter a message between 20 and 2,000 characters." }, { status: 400 });
    }
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    const [sponsor] = await db.select().from(sponsors).where(and(eq(sponsors.id, sponsorId), eq(sponsors.isActive, true))).limit(1);
    if (!event || !sponsor) {
      return NextResponse.json({ error: "Choose a valid event and sponsor." }, { status: 400 });
    }
    const [targetMember] = targetMemberId
      ? await db.select({ id: members.id, name: members.name, email: members.email, role: members.primaryRole })
          .from(members).where(eq(members.id, targetMemberId)).limit(1)
      : [];
    if (direction === "sponsor_to_member" && (!targetMember || !["model", "photographer"].includes(targetMember.role))) {
      return NextResponse.json({ error: "Choose a valid model or photographer to sponsor." }, { status: 400 });
    }
    if (direction === "sponsor_to_event" && !event.participationPaths.some((path) => path.type === "sponsor" && path.enabled)) {
      return NextResponse.json({ error: "This event is not currently accepting sponsorship offers." }, { status: 409 });
    }
    if (direction === "sponsor_to_member" && targetMember && !event.participationPaths.some((path) => path.type === targetMember.role && path.enabled)) {
      return NextResponse.json({ error: `This event is not currently accepting ${targetMember.role}s.` }, { status: 409 });
    }
    const travelEligible =
      event.passportRequired ||
      event.category.toLowerCase().includes("destination") ||
      event.category.toLowerCase().includes("photoshoot") ||
      event.shootTypes.length > 0;
    if ((flightIncluded || hotelIncluded) && !travelEligible) {
      return NextResponse.json({ error: "Travel support is limited to destination shoots and eligible photoshoots." }, { status: 400 });
    }
    if (direction === "sponsor_to_member" && cashAmountCents === 0 && !flightIncluded && !hotelIncluded && !offerDetails) {
      return NextResponse.json({ error: "Include cash, a flight, a hotel, or another item in the support package." }, { status: 400 });
    }
    if (representationRequired && representationTerms.length < 20) {
      return NextResponse.json({ error: "Add at least 20 characters describing the representation terms." }, { status: 400 });
    }
    if (direction === "promoter_to_sponsor" && event.ownerId !== member.id) {
      return NextResponse.json({ error: "Only this event’s host can invite sponsors." }, { status: 403 });
    }
    if (direction === "sponsor_to_event" || direction === "sponsor_to_member") {
      const [membership] = await db
        .select({ id: sponsorMembers.id })
        .from(sponsorMembers)
        .where(
          and(
            eq(sponsorMembers.memberId, member.id),
            eq(sponsorMembers.sponsorId, sponsor.id),
          ),
        )
        .limit(1);
      if (!membership) {
        return NextResponse.json(
          { error: "Use the sponsor account connected to this company." },
          { status: 403 },
        );
      }
    }
    const capacity = await assertSponsorOutreachCapacity(member.id);
    if (!capacity.ok) {
      return NextResponse.json({ error: capacity.error }, { status: 403 });
    }
    const [record] = await db
      .insert(sponsorshipRequests)
      .values({
        eventId,
        sponsorId,
        requesterMemberId: member.id,
        targetMemberId: targetMember?.id,
        direction,
        message,
        contributionType,
        cashAmountCents,
        offerDetails,
        flightIncluded,
        hotelIncluded,
        representationRequired,
        representationTerms,
        responseMemberId: member.id,
      })
      .returning({ id: sponsorshipRequests.id });
    await db.insert(sponsorshipRequestMessages).values({ requestId: record.id, senderMemberId: member.id, senderName: member.name, body: message });
    const [owner] = event.ownerId
      ? await db
          .select({ email: members.email })
          .from(members)
          .where(eq(members.id, event.ownerId))
          .limit(1)
      : [];
    await sendSponsorshipNotice({
      email: direction === "promoter_to_sponsor" ? sponsor.contactEmail : owner?.email ?? sponsor.contactEmail,
      sponsorName: sponsor.name,
      eventTitle: event.title,
      direction,
      message,
    });
    if (direction === "sponsor_to_member" && targetMember?.email) {
      await sendSponsorshipNotice({
        email: targetMember.email,
        sponsorName: sponsor.name,
        eventTitle: event.title,
        direction,
        message,
      });
    }
    return NextResponse.json({ ok: true, id: record.id }, { status: 201 });
  } catch (error) {
    console.error("Sponsorship request failed", error);
    return NextResponse.json({ error: "Could not send the sponsorship request." }, { status: 500 });
  }
}
