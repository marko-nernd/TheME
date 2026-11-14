import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { deleteEventRecord } from "@/lib/delete-event";
import { parseExternalEventDestination } from "@/lib/event-destination";
import { eventValues } from "@/lib/admin-event-values";
import { isHostRole } from "@/lib/roles";
import { updateEventWithTravel } from "@/lib/update-event-travel";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || !isHostRole(member.primaryRole)) {
    return NextResponse.json({ error: "Event-owner authentication required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const values = typeof body.title === "string"
      ? eventValues(body)
      : parseExternalEventDestination(body);
    const updated = await updateEventWithTravel((await params).id, values, member.id);
    if (!updated) return NextResponse.json({ error: "Owned event not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ACCOMMODATION_OPTIONS") return NextResponse.json({ error: "Add a description and a valid http or https booking link for each accommodation." }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_TRAVEL") return NextResponse.json({ error: "Check the travel fields. Airport code must be three letters, and timezone must be a valid IANA timezone." }, { status: 400 });
    if (error instanceof Error && ["INVALID_EVENT", "INVALID_EXTERNAL_EVENT_URL"].includes(error.message)) {
      return NextResponse.json({ error: "Complete the required event fields and check dates, location, capacity, pricing, refund settings, and participation paths." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not update the event destination." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (
    !member?.emailVerifiedAt ||
    !isHostRole(member.primaryRole)
  ) {
    return NextResponse.json({ error: "Event-owner authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const [ownedEvent] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, id), eq(events.ownerId, member.id)))
    .limit(1);
  if (!ownedEvent) {
    return NextResponse.json({ error: "Owned event not found." }, { status: 404 });
  }
  const deleted = await deleteEventRecord(id, { type: "owner", id: member.id });
  return NextResponse.json({ ok: Boolean(deleted) });
}
