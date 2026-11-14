import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipations, eventTransactions, events } from "@/db/schema";
import { hashToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json().catch(() => ({}));
    const guestToken = typeof body.guestToken === "string" ? body.guestToken : "";
    if (!guestToken) {
      return NextResponse.json({ error: "Guest access is required." }, { status: 401 });
    }

    const [record] = await db
      .select({
        id: eventParticipations.id,
        memberId: eventParticipations.memberId,
        guestAccessTokenHash: eventParticipations.guestAccessTokenHash,
        status: eventParticipations.status,
        applicantName: eventParticipations.applicantName,
        applicantEmail: eventParticipations.applicantEmail,
        pathType: eventParticipations.pathType,
        priceCents: eventParticipations.priceCents,
        grossCents: eventTransactions.grossCents,
        eventId: events.id,
        eventSlug: events.slug,
        eventTitle: events.title,
        eventLocation: events.location,
        eventVenue: events.venue,
        eventStartsAt: events.startsAt,
        eventEndsAt: events.endsAt,
        eventSummary: events.summary,
        eventDescription: events.description,
        eventIncluded: events.included,
        eventRequirements: events.requirements,
        eventImagePath: events.imagePath,
        eventMediaType: events.mediaType,
        hasEventMedia: sql<boolean>`${events.mediaData} is not null`,
      })
      .from(eventParticipations)
      .innerJoin(events, eq(eventParticipations.eventId, events.id))
      .leftJoin(
        eventTransactions,
        and(
          eq(eventTransactions.participationId, eventParticipations.id),
          eq(eventTransactions.status, "paid"),
        ),
      )
      .where(eq(eventParticipations.id, (await params).id))
      .limit(1);

    const authorized = Boolean(
      record &&
      !record.memberId &&
      record.guestAccessTokenHash === hashToken(guestToken),
    );
    if (!authorized || !record) {
      return NextResponse.json({ error: "This guest pass is invalid or has expired." }, { status: 401 });
    }

    const confirmationCode = `ME-${record.id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const mediaUrl = record.hasEventMedia
      ? `/api/events/${record.eventId}/media`
      : record.eventImagePath;

    return NextResponse.json({
      pass: {
        id: record.id,
        confirmationCode,
        status: record.status,
        applicantName: record.applicantName,
        applicantEmail: record.applicantEmail,
        pathType: record.pathType,
        amountCents: record.grossCents ?? record.priceCents,
        event: {
          id: record.eventId,
          slug: record.eventSlug,
          title: record.eventTitle,
          location: record.eventLocation,
          venue: record.eventVenue,
          startsAt: record.eventStartsAt.toISOString(),
          endsAt: record.eventEndsAt?.toISOString() ?? null,
          summary: record.eventSummary,
          description: record.eventDescription,
          included: record.eventIncluded,
          requirements: record.eventRequirements,
          media: {
            type: record.hasEventMedia && record.eventMediaType === "video" ? "video" : "image",
            url: mediaUrl,
            posterUrl: record.hasEventMedia && record.eventMediaType === "video"
              ? `/api/events/${record.eventId}/media?poster=1`
              : null,
          },
        },
      },
    });
  } catch (error) {
    console.error("Unable to load guest event pass", error);
    return NextResponse.json({ error: "Unable to load this guest pass." }, { status: 500 });
  }
}
