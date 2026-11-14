import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipations, events, eventTransactions } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { eventConfirmationCode } from "@/lib/confirmation-code";
import { uuidPattern } from "@/lib/event-pass";

async function ownedEvent(id: string, memberId: string) {
  if (!uuidPattern.test(id)) return null;
  const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.ownerId, memberId))).limit(1);
  return event;
}
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in as the event host." }, { status: 401 });
  const event = await ownedEvent((await params).id, member.id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const people = await db.select({ id: eventParticipations.id, name: eventParticipations.applicantName, role: eventParticipations.pathType, checkedInAt: eventParticipations.checkedInAt, priceCents: eventParticipations.priceCents, paid: eventTransactions.id }).from(eventParticipations).leftJoin(eventTransactions, and(eq(eventTransactions.participationId, eventParticipations.id), eq(eventTransactions.status, "paid"))).where(and(eq(eventParticipations.eventId, event.id), eq(eventParticipations.status, "confirmed")));
  const attendees = people.filter((row) => row.priceCents === 0 || row.paid).map(({ id, name, role, checkedInAt }) => ({ id, name, role, checkedInAt }));
  return NextResponse.json({ attendees, opensAt: new Date(event.startsAt.getTime() - 86400000), closesAt: new Date((event.endsAt ?? event.startsAt).getTime() + 43200000) }, { headers: { "cache-control": "private, no-store" } });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in as the event host." }, { status: 401 });
  const event = await ownedEvent((await params).id, member.id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const now = Date.now();
  if (now < event.startsAt.getTime() - 86400000 || now > (event.endsAt ?? event.startsAt).getTime() + 43200000) return NextResponse.json({ error: "Check-in opens 24 hours before the event and closes 12 hours after its end." }, { status: 409 });
  const body = await request.json().catch(() => ({}));
  const input = typeof body.code === "string" ? body.code.trim().slice(0, 200) : "";
  const parts = input.split(":");
  const secure = parts.length === 3 && parts[0] === "MEPASS" && uuidPattern.test(parts[1]) && uuidPattern.test(parts[2]);
  if (!secure && !/^[A-Z0-9]{6}$/i.test(input)) return NextResponse.json({ error: "Scan the current event pass QR, or enter its six-character confirmation code." }, { status: 400 });
  const rows = await db.select({ id: eventParticipations.id, name: eventParticipations.applicantName, checkedInAt: eventParticipations.checkedInAt, priceCents: eventParticipations.priceCents, paid: eventTransactions.id, confirmation: eventTransactions.confirmationCode }).from(eventParticipations).leftJoin(eventTransactions, and(eq(eventTransactions.participationId, eventParticipations.id), eq(eventTransactions.status, "paid"))).where(and(eq(eventParticipations.eventId, event.id), eq(eventParticipations.status, "confirmed"), secure ? and(eq(eventParticipations.id, parts[1]), eq(eventParticipations.checkInToken, parts[2])) : undefined));
  const matches = rows.filter((row) => (row.priceCents === 0 || row.paid) && (secure || (row.confirmation ?? eventConfirmationCode(row.id)) === input.toUpperCase()));
  if (matches.length !== 1) return NextResponse.json({ error: matches.length > 1 ? "Use the QR code to distinguish these bookings." : "No active confirmed pass matches this event. Canceled or refunded bookings cannot check in." }, { status: 404 });
  const person = matches[0];
  const [updated] = await db.update(eventParticipations).set({ checkedInAt: new Date(), checkedInBy: member.id, updatedAt: new Date() }).where(and(eq(eventParticipations.id, person.id), eq(eventParticipations.status, "confirmed"), isNull(eventParticipations.checkedInAt), sql`(${eventParticipations.priceCents} = 0 OR EXISTS (SELECT 1 FROM event_transactions WHERE participation_id = ${eventParticipations.id} AND status = 'paid'))`)).returning({ checkedInAt: eventParticipations.checkedInAt });
  if (!updated) return NextResponse.json({ error: `${person.name} is already checked in or the pass has become inactive. Refresh the attendee list; do not admit twice.` }, { status: 409 });
  return NextResponse.json({ ok: true, name: person.name, checkedInAt: updated.checkedInAt });
}
