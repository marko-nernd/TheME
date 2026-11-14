import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipations, events, memberNotifications } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { notifyMember } from "@/lib/notifications";
import { assertTransition } from "@/lib/workflow";
import { BookingChangeError, cancelBooking } from "@/lib/cancel-booking";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Verified host account required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const action = body.action === "approve" ? "approve" : body.action === "decline" ? "decline" : body.action === "remove" ? "remove" : "";
    if (!action) {
      return NextResponse.json({ error: "Choose approve, decline, or remove." }, { status: 400 });
    }
    const [record] = await db
      .select({
        id: eventParticipations.id,
        memberId: eventParticipations.memberId,
        priceCents: eventParticipations.priceCents,
        status: eventParticipations.status,
        eventTitle: events.title,
        eventSlug: events.slug,
      })
      .from(eventParticipations)
      .innerJoin(events, eq(eventParticipations.eventId, events.id))
      .where(
        and(
          eq(eventParticipations.id, (await params).id),
          eq(events.ownerId, member.id),
        ),
      )
      .limit(1);
    if (!record) {
      return NextResponse.json({ error: "Event participant not found." }, { status: 404 });
    }
    if (action !== "remove" && record.status !== "pending") {
      return NextResponse.json({ error: "Pending request not found." }, { status: 404 });
    }
    if (action === "remove" && !["pending", "approved", "awaiting_payment", "confirmed"].includes(record.status)) {
      return NextResponse.json({ error: "This participant can no longer be removed." }, { status: 409 });
    }
    const nextStatus = action === "remove"
      ? "cancelled"
      : action === "decline"
        ? "declined"
        : record.priceCents > 0
          ? "approved"
          : "confirmed";
    assertTransition("participation", record.status, nextStatus);
    if (action === "remove") await cancelBooking(record.id, member.id, true, "Removed by host");
    else await db
      .update(eventParticipations)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(eventParticipations.id, record.id), eq(eventParticipations.status, "pending")));
    await db.update(memberNotifications).set({ readAt: new Date() }).where(eq(memberNotifications.resourceId, record.id));
    if (record.memberId) await notifyMember({
      memberId: record.memberId,
      type: action === "approve" ? "event_approved" : "event_declined",
      resourceId: record.id,
      title: action === "approve" ? "Your event request was approved" : action === "remove" ? "You were removed from an event" : "Your event request was declined",
      message: action === "approve"
        ? record.priceCents > 0
          ? `${record.eventTitle} approved your participation. Complete payment to confirm your place.`
          : `${record.eventTitle} approved your participation. You are confirmed.`
        : action === "remove"
          ? `The host removed you from ${record.eventTitle}. Contact the host about any applicable refund.`
        : `${record.eventTitle} declined your participation request.`,
      href: action === "approve" && record.priceCents > 0 ? "/dashboard#events" : action === "remove" ? "/dashboard#events" : `/events/${record.eventSlug}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BookingChangeError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Host participation decision failed", error);
    return NextResponse.json({ error: "Could not update the request." }, { status: 500 });
  }
}
