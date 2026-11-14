import { and, eq, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db as database } from "@/db";
import { eventParticipations, events, eventTransactions, memberNotifications } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { defaultParticipationPaths } from "@/lib/participation";
import { randomUUID } from "node:crypto";
import { uuidPattern } from "@/lib/event-pass";
import { createToken, hashToken } from "@/lib/auth";
import { sendEventConfirmationEmail, sendGuestEventAccessEmail } from "@/lib/email";
import { isGuestOnlyEventRole } from "@/lib/roles";
import { eventCustomerCheckoutCents } from "@/lib/platform-fees";
import { eventConfirmationCode } from "@/lib/confirmation-code";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const member = await getCurrentMember();

  try {
    const body = await request.json();
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    if (!uuidPattern.test(eventId)) return NextResponse.json({ error: "Choose an event." }, { status: 400 });
    // Lock the event before counting seats: concurrent bookings cannot oversell the last place.
    return await database.transaction(async (db) => {
    const pathType = typeof body.pathType === "string" ? body.pathType : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const requestedAccommodation = body.accommodationType === "hotel" || body.accommodationType === "villa" ? body.accommodationType : null;
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.isPublished, true)))
      .for("update")
      .limit(1);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    if ((event.endsAt ?? event.startsAt).getTime() < Date.now()) return NextResponse.json({ error: "This event has ended and is no longer accepting bookings." }, { status: 409 });
    const paths = event.participationPaths.length
      ? event.participationPaths
      : defaultParticipationPaths;
    const path = paths.find(
      (candidate) => candidate.enabled && candidate.type === pathType,
    );
    if (!path) {
      return NextResponse.json({ error: "That participation path is unavailable." }, { status: 400 });
    }
    const isGuest = path.type === "attendee" && !member;
    if (!isGuest && !member?.emailVerifiedAt) {
      return NextResponse.json({ error: "Verified member account required." }, { status: 401 });
    }
    const applicantName = member?.name ?? (typeof body.applicantName === "string" ? body.applicantName.trim().slice(0, 120) : "");
    const applicantEmail = (member?.email ?? (typeof body.applicantEmail === "string" ? body.applicantEmail.trim().toLowerCase() : "")).toLowerCase();
    if (applicantName.length < 2 || !emailPattern.test(applicantEmail)) {
      return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 });
    }
    if (member && isGuestOnlyEventRole(member.primaryRole) && path.type !== "attendee") {
      return NextResponse.json(
        { error: "Host and Sponsor accounts can attend events only through the general guest path." },
        { status: 403 },
      );
    }
    if (path.type === "model" && member?.primaryRole !== "model") {
      return NextResponse.json({ error: "The model path requires a model account." }, { status: 403 });
    }
    if (path.type === "photographer" && member?.primaryRole !== "photographer") {
      return NextResponse.json({ error: "The photographer path requires a photographer account." }, { status: 403 });
    }
    if (path.type === "sponsor") {
      return NextResponse.json({ error: "Use the sponsorship request workflow to support this event." }, { status: 403 });
    }
    if (member && ["model", "photographer"].includes(member.primaryRole) && path.type !== member.primaryRole) {
      return NextResponse.json({ error: `Your ${member.primaryRole} account can only join through the ${member.primaryRole} participation path.` }, { status: 403 });
    }
    if (note.length > 1500) {
      return NextResponse.json(
        { error: "The optional message must be 1,500 characters or fewer." },
        { status: 400 },
      );
    }
    const existingConditions = member
      ? and(eq(eventParticipations.eventId, event.id), eq(eventParticipations.memberId, member.id))
      : and(eq(eventParticipations.eventId, event.id), eq(eventParticipations.applicantEmail, applicantEmail));
    const [existingParticipation] = await db
      .select({
        id: eventParticipations.id,
        status: eventParticipations.status,
        accommodationType: eventParticipations.accommodationType,
        priceCents: eventParticipations.priceCents,
        accommodationPriceCents: eventParticipations.accommodationPriceCents,
      })
      .from(eventParticipations)
      .where(and(existingConditions, notInArray(eventParticipations.status, ["declined", "cancelled", "refunded"])))
      .limit(1);
    if (
      existingParticipation &&
      !["declined", "cancelled", "refunded"].includes(existingParticipation.status)
    ) {
      if (member && existingParticipation.status === "awaiting_payment") return NextResponse.json({ ok: true, resumed: true, participation: { id: existingParticipation.id, status: existingParticipation.status }, accommodationType: existingParticipation.accommodationType, quote: eventCustomerCheckoutCents(existingParticipation.priceCents), stayCents: existingParticipation.accommodationPriceCents });
      if (isGuest && ["awaiting_payment", "confirmed"].includes(existingParticipation.status)) {
        const replacementToken = createToken();
        await db.update(eventParticipations).set({ guestAccessTokenHash: hashToken(replacementToken), updatedAt: new Date() }).where(eq(eventParticipations.id, existingParticipation.id));
        try {
          await sendGuestEventAccessEmail({
            email: applicantEmail,
            name: applicantName,
            eventTitle: event.title,
            participationId: existingParticipation.id,
            guestToken: replacementToken,
          });
        } catch (error) {
          console.warn("Unable to send refreshed guest event access email", error);
        }
        return NextResponse.json({ ok: true, emailAccessSent: true }, { status: 200 });
      }
      return NextResponse.json(
        { ok: true, participation: existingParticipation, existing: true },
        { status: 200 },
      );
    }
    const activeRows = await db
      .select({ id: eventParticipations.id, accommodationType: eventParticipations.accommodationType })
      .from(eventParticipations)
      .where(
        and(
          eq(eventParticipations.eventId, event.id),
          eq(eventParticipations.pathType, path.type),
          notInArray(eventParticipations.status, ["declined", "cancelled", "refunded"]),
        ),
      );
    if (activeRows.length >= path.capacity) {
      return NextResponse.json({ error: "This participation path is full." }, { status: 409 });
    }
    if (requestedAccommodation === "villa") {
      const villaRoleAllowed = path.type === "photographer" ? event.villaPhotographersAllowed : path.type === "model" ? event.villaModelsAllowed : false;
      const villaCapacity = villaRoleAllowed ? (path.type === "photographer" ? event.villaPhotographerSpots : path.type === "model" ? event.villaModelSpots : 0) : 0;
      const reservedVillaSpaces = activeRows.filter((row) => row.accommodationType === "villa").length;
      if (villaCapacity < 1 || reservedVillaSpaces >= villaCapacity) {
        return NextResponse.json({ error: `Villa spaces for ${path.type}s are currently full.` }, { status: 409 });
      }
    }
    if (requestedAccommodation === "hotel") {
      const hotelRoleAllowed = path.type === "photographer" ? event.hotelPhotographersAllowed : path.type === "model" ? event.hotelModelsAllowed : false;
      if (!event.hotelAvailable || !hotelRoleAllowed) {
        return NextResponse.json({ error: `Hotel accommodation is not offered for ${path.type}s.` }, { status: 403 });
      }
    }
    const accommodationPriceCents =
      requestedAccommodation === "hotel" && event.hotelAvailable
        ? event.hotelPriceCents
        : requestedAccommodation === "villa" && event.villaAvailable
          ? path.type === "photographer"
            ? event.villaPhotographerPriceCents
            : event.villaModelPriceCents
          : 0;
    if (requestedAccommodation && accommodationPriceCents <= 0) {
      return NextResponse.json({ error: "That accommodation option is unavailable." }, { status: 400 });
    }
    if (requestedAccommodation && !["model", "photographer"].includes(path.type)) {
      return NextResponse.json({ error: "Accommodation upgrades are available only to models and photographers." }, { status: 400 });
    }
    const participationPriceCents = path.priceCents;
    const finalPriceCents = participationPriceCents + accommodationPriceCents;
    const bypassApproval = path.type === "attendee" || Boolean(member && ["model", "photographer"].includes(member.primaryRole) && path.type === member.primaryRole);
    const status: "pending" | "awaiting_payment" | "confirmed" = bypassApproval
      ? finalPriceCents > 0
        ? "awaiting_payment"
        : "confirmed"
      : path.approvalRequired
        ? "pending"
        : finalPriceCents > 0
          ? "awaiting_payment"
          : "confirmed";
    const participationValues = {
      pathType: path.type,
      status,
      applicantName,
      applicantEmail,
      note,
      priceCents: finalPriceCents,
      sponsorAmountCents: null,
      accommodationType: requestedAccommodation,
      accommodationPriceCents,
    };
    const guestToken = isGuest ? createToken() : null;
    const [participation] = await db
          .insert(eventParticipations)
          .values({
            eventId: event.id,
            memberId: member?.id ?? null,
            guestAccessTokenHash: guestToken ? hashToken(guestToken) : null,
            ...participationValues,
          })
          .returning({ id: eventParticipations.id, status: eventParticipations.status });
    if (event.ownerId) {
      await db.insert(memberNotifications).values({
        memberId: event.ownerId,
        type: "event_request",
        resourceId: participation.id,
        title: status === "pending" ? "New event participation request" : "New event participant",
        message: status === "pending"
          ? `${applicantName} requested to join ${event.title} as a ${path.type}.`
          : `${applicantName} joined ${event.title} as a ${path.type}${status === "awaiting_payment" ? " and is completing payment" : ""}.`,
        href: "/dashboard#events",
      });
    }
    if (status === "confirmed" && path.type === "attendee") {
      await sendEventConfirmationEmail({
        email: applicantEmail,
        name: applicantName,
        eventTitle: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        pathLabel: path.title,
        eventSlug: event.slug,
        confirmationCode: eventConfirmationCode(participation.id),
        passHref: `/passes/${participation.id}${guestToken ? `?token=${encodeURIComponent(guestToken)}` : ""}`,
      });
      await db.update(eventParticipations).set({ confirmationEmailSentAt: new Date(), updatedAt: new Date() }).where(eq(eventParticipations.id, participation.id));
    }
    if (guestToken) {
      try {
        await sendGuestEventAccessEmail({
          email: applicantEmail,
          name: applicantName,
          eventTitle: event.title,
          participationId: participation.id,
          guestToken,
        });
      } catch (error) {
        console.warn("Unable to send guest event access email", error);
      }
    }
    return NextResponse.json({ ok: true, participation, quote: eventCustomerCheckoutCents(finalPriceCents), stayCents: accommodationPriceCents, ...(guestToken ? { guestToken } : {}) }, { status: 201 });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "You already have a request for this participation path." },
        { status: 409 },
      );
    }
    console.error("Event participation failed", error);
    return NextResponse.json({ error: "Could not submit your request." }, { status: 500 });
  }
}
