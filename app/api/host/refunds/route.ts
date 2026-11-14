import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventRefundRequests, eventTransactions, events, members } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { uuidPattern } from "@/lib/event-pass";
export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || member.primaryRole !== "host") return NextResponse.json({ error: "Host account required." }, { status: 401 });
  const eventId = new URL(request.url).searchParams.get("event");
  if (!eventId || !uuidPattern.test(eventId)) return NextResponse.json({ error: "Choose an event." }, { status: 400 });
  const rows = await db.select({ id: eventRefundRequests.id, reason: eventRefundRequests.reason, status: eventRefundRequests.status, requestedAt: eventRefundRequests.requestedAt, name: members.name, amountCents: eventTransactions.grossCents, confirmation: eventTransactions.confirmationCode }).from(eventRefundRequests).innerJoin(eventTransactions, eq(eventTransactions.id, eventRefundRequests.transactionId)).innerJoin(events, eq(events.id, eventTransactions.eventId)).leftJoin(members, eq(members.id, eventRefundRequests.memberId)).where(and(eq(events.id, eventId), eq(events.ownerId, member.id))).orderBy(desc(eventRefundRequests.requestedAt)).limit(100);
  return NextResponse.json({ requests: rows }, { headers: { "cache-control": "private, no-store" } });
}
