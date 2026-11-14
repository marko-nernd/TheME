import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventRefundRequests, eventTransactions, events, memberNotifications } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getTestStripe } from "@/lib/host-payouts";
import { applyEventRefund } from "@/lib/event-refunds";
import { uuidPattern } from "@/lib/event-pass";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || member.primaryRole !== "host") return NextResponse.json({ error: "Host account required." }, { status: 401 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid refund request." }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!["approve", "deny"].includes(body.action) || note.length < 5) return NextResponse.json({ error: "Choose a decision and add a short note for the member." }, { status: 400 });
  const [row] = await db.select({ request: eventRefundRequests, payment: eventTransactions, host: events.ownerId, title: events.title }).from(eventRefundRequests).innerJoin(eventTransactions, eq(eventTransactions.id, eventRefundRequests.transactionId)).innerJoin(events, eq(events.id, eventTransactions.eventId)).where(and(eq(eventRefundRequests.id, id), eq(events.ownerId, member.id))).limit(1);
  if (!row) return NextResponse.json({ error: "Refund request not found." }, { status: 404 });
  if (!["requested", "failed", "processing"].includes(row.request.status)) return NextResponse.json({ error: "This refund request has already been handled." }, { status: 409 });
  if (body.action === "deny") {
    const [denied] = await db.update(eventRefundRequests).set({ status: "denied", decisionNote: note, updatedAt: new Date() }).where(and(eq(eventRefundRequests.id, id), eq(eventRefundRequests.status, "requested"))).returning({ id: eventRefundRequests.id });
    if (!denied) return NextResponse.json({ error: "A refund is already processing. Refresh its status instead." }, { status: 409 });
  } else {
    try {
      const stripe = getTestStripe();
      const [claimed] = await db.update(eventRefundRequests).set({ status: "processing", decisionNote: note, updatedAt: new Date() }).where(and(eq(eventRefundRequests.id, id), inArray(eventRefundRequests.status, ["requested", "failed", "processing"]))).returning({ id: eventRefundRequests.id });
      if (!claimed) return NextResponse.json({ error: "This request was already handled. Refresh before continuing." }, { status: 409 });
      if (!row.payment.stripePaymentIntentId) throw new Error("This payment has no Stripe reference. It cannot be refunded automatically.");
      const intent = await stripe.paymentIntents.retrieve(row.payment.stripePaymentIntentId);
      if (intent.livemode || intent.metadata.participationId !== row.payment.participationId || intent.amount_received !== row.payment.grossCents) throw new Error("Stripe payment does not match this test transaction.");
      const refund = row.request.stripeRefundId ? await stripe.refunds.retrieve(row.request.stripeRefundId) : await stripe.refunds.create({ payment_intent: intent.id, amount: row.payment.grossCents, reason: "requested_by_customer", ...(intent.transfer_data?.destination ? { reverse_transfer: true } : {}), metadata: { eventRefundRequestId: id } }, { idempotencyKey: `event-refund-full-${row.payment.id}` });
      await db.update(eventRefundRequests).set({ stripeRefundId: refund.id }).where(eq(eventRefundRequests.id, id));
      await applyEventRefund(refund);
    } catch (error) {
      console.error("Test event refund failed", error instanceof Error ? error.message : "Unknown error");
      return NextResponse.json({ error: "The test refund could not be confirmed. No live refunds are enabled. Check the Stripe reference and test configuration, then retry the same request." }, { status: 503 });
    }
  }
  await db.update(memberNotifications).set({ readAt: new Date() }).where(eq(memberNotifications.resourceId, id));
  if (row.request.memberId) await db.insert(memberNotifications).values({ memberId: row.request.memberId, type: "refund_update", resourceId: id, title: body.action === "deny" ? "Refund request declined" : "Refund status updated", message: `${row.title}: ${note} Check your event payment history for the confirmed refund status.`, href: "/dashboard#billing" });
  return NextResponse.json({ ok: true });
}
