import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventRefundRequests, eventTransactions, eventParticipations } from "@/db/schema";
export async function applyEventRefund(refund: Stripe.Refund) {
  const intentId = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  if (!intentId) return;
  await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(eventTransactions).where(eq(eventTransactions.stripePaymentIntentId, intentId)).for("update").limit(1);
    if (!payment || refund.amount !== payment.grossCents) return; // Partial refunds must not void a whole event pass.
    const status = refund.status === "succeeded" ? "refunded" : refund.status === "failed" || refund.status === "canceled" ? "paid" : "refund_pending";
    if (payment.status === "refunded" && status !== "refunded") return; // An older webhook cannot restore a refunded payment.
    await tx.update(eventTransactions).set({ status, updatedAt: new Date() }).where(eq(eventTransactions.id, payment.id));
    await tx.update(eventRefundRequests).set({ stripeRefundId: refund.id, status: status === "refunded" ? "succeeded" : status === "paid" ? "failed" : "processing", updatedAt: new Date() }).where(eq(eventRefundRequests.transactionId, payment.id));
    if (status === "refunded" && payment.participationId) await tx.update(eventParticipations).set({ status: "refunded", updatedAt: new Date() }).where(eq(eventParticipations.id, payment.participationId));
  });
}
