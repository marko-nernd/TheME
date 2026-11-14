import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventTransactions, eventParticipations, eventRefundRequests, memberNotifications } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { uuidPattern } from "@/lib/event-pass";
async function context(id: string, memberId: string) {
  if (!uuidPattern.test(id)) return null;
  const [payment] = await db.select({ id: eventTransactions.id, status: eventTransactions.status, startsAt: events.startsAt, days: events.refundDaysBefore, noRefunds: events.noRefunds, hostId: events.ownerId, title: events.title, checkedInAt: eventParticipations.checkedInAt }).from(eventTransactions).innerJoin(events, eq(events.id, eventTransactions.eventId)).leftJoin(eventParticipations, eq(eventParticipations.id, eventTransactions.participationId)).where(and(eq(eventTransactions.id, id), eq(eventTransactions.memberId, memberId))).limit(1);
  if (!payment) return null;
  const cutoff = new Date(payment.startsAt.getTime() - payment.days * 86400000);
  const [request] = await db.select().from(eventRefundRequests).where(eq(eventRefundRequests.transactionId, id)).limit(1);
  return { payment, request, cutoff, eligible: payment.status === "paid" && !payment.noRefunds && !payment.checkedInAt && Date.now() <= cutoff.getTime() };
}
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const value = await context((await params).id, member.id);
  if (!value) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  return NextResponse.json({ eligible: value.eligible, cutoff: value.cutoff, request: value.request ? { status: value.request.status, decisionNote: value.request.decisionNote } : null }, { headers: { "cache-control": "private, no-store" } });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const value = await context((await params).id, member.id);
  if (!value) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (!value.eligible) return NextResponse.json({ error: "This payment is outside the event’s refund policy or is already being refunded. Contact the host about exceptional circumstances." }, { status: 409 });
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (reason.length < 10) return NextResponse.json({ error: "Add at least 10 characters explaining your request." }, { status: 400 });
  const [saved] = await db.insert(eventRefundRequests).values({ transactionId: value.payment.id, memberId: member.id, reason }).onConflictDoNothing().returning({ id: eventRefundRequests.id });
  if (!saved) return NextResponse.json({ error: "A refund request already exists for this payment." }, { status: 409 });
  if (value.payment.hostId) await db.insert(memberNotifications).values({ memberId: value.payment.hostId, type: "refund_requested", resourceId: saved.id, title: "Refund request to review", message: `${member.name} requested a refund for ${value.payment.title}. No refund has been issued yet.`, href: "/dashboard#events" });
  return NextResponse.json({ ok: true }, { status: 201 });
}
