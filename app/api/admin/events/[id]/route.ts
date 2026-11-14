import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { eventValues } from "@/lib/admin-event-values";
import { deleteEventRecord } from "@/lib/delete-event";
import { recordAdminAudit } from "@/lib/admin-audit";
import { updateEventWithTravel } from "@/lib/update-event-travel";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  try {
    const values = eventValues(await request.json());
    const eventId = (await params).id;
    const before = await updateEventWithTravel(eventId, values);
    if (!before) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    await recordAdminAudit({ adminId: admin.id, action: "update", resourceType: "event", resourceId: eventId, beforeData: before as unknown as Record<string, unknown>, afterData: values as unknown as Record<string, unknown> });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ACCOMMODATION_OPTIONS") return NextResponse.json({ error: "Add a description and a valid http or https booking link for each accommodation." }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_TRAVEL") return NextResponse.json({ error: "Check the travel fields. Airport code must be three letters, and timezone must be a valid IANA timezone." }, { status: 400 });
    if (error instanceof Error && ["INVALID_EVENT", "INVALID_EXTERNAL_EVENT_URL"].includes(error.message)) {
      return NextResponse.json({ error: "Complete the required event fields and check capacity, spots, and cost." }, { status: 400 });
    }
    console.error("Admin event update failed", error);
    return NextResponse.json({ error: "Could not update the event." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const eventId = (await params).id;
  const [before] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  const deleted = await deleteEventRecord(eventId, { type: "admin", id: admin.id });
  if (!deleted) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  await recordAdminAudit({ adminId: admin.id, action: "delete", resourceType: "event", resourceId: eventId, beforeData: before as unknown as Record<string, unknown>, detail: "Event deleted with associated event-owned files." });
  return NextResponse.json({ ok: true });
}
