import type Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { eventParticipations, eventTransactions, events, eventRefundRequests, memberNotifications } from "@/db/schema";
import { eventCustomerCheckoutCents } from "@/lib/platform-fees";
import { sendEventConfirmationEmail } from "@/lib/email";
import { eventConfirmationCode } from "@/lib/confirmation-code";

export async function finalizeEventPayment(paymentIntent: Stripe.PaymentIntent) {
  const participationId = paymentIntent.metadata.participationId;
  if (
    paymentIntent.status !== "succeeded" ||
    paymentIntent.metadata.kind !== "event_participation" ||
    !participationId
  ) {
    return false;
  }

  const confirmation = await db.transaction(async (transaction) => {
    const [participation] = await transaction
      .select({
        id: eventParticipations.id,
        memberId: eventParticipations.memberId,
        eventId: eventParticipations.eventId,
        grossCents: eventParticipations.priceCents,
        status: eventParticipations.status,
        intentId: eventParticipations.stripePaymentIntentId,
        applicantName: eventParticipations.applicantName,
        applicantEmail: eventParticipations.applicantEmail,
        pathType: eventParticipations.pathType,
        hostMemberId: events.ownerId,
        eventTitle: events.title,
        eventSlug: events.slug,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        location: events.location,
      })
      .from(eventParticipations)
      .innerJoin(events, eq(eventParticipations.eventId, events.id))
      .where(eq(eventParticipations.id, participationId))
      .limit(1);
    if (!participation) throw new Error("Paid participation not found.");
    const [locked] = await transaction.select().from(eventParticipations).where(eq(eventParticipations.id, participation.id)).for("update").limit(1);
    const [existing] = await transaction.select({ id: eventTransactions.id, status: eventTransactions.status, confirmationCode: eventTransactions.confirmationCode }).from(eventTransactions).where(eq(eventTransactions.stripePaymentIntentId, paymentIntent.id)).limit(1);
    const fee = Number(paymentIntent.metadata.customerFeeCents);
    if (locked.stripePaymentIntentId !== paymentIntent.id || paymentIntent.livemode || paymentIntent.currency !== "usd" || Number(paymentIntent.metadata.baseAmountCents) !== locked.priceCents || !Number.isSafeInteger(fee) || fee < 0 || paymentIntent.amount_received !== paymentIntent.amount || paymentIntent.amount !== locked.priceCents + fee) throw new Error("Payment does not match the saved booking.");
    const needsReview = ["cancelled", "refunded", "declined"].includes(locked.status);
    const confirmationCode = eventConfirmationCode(paymentIntent.id);
    const confirmationDetails = {
      participationId: participation.id,
      email: participation.applicantEmail,
      name: participation.applicantName,
      eventTitle: participation.eventTitle,
      startsAt: participation.startsAt,
      endsAt: participation.endsAt,
      location: participation.location,
      pathType: participation.pathType,
      eventSlug: participation.eventSlug,
      confirmationCode,
      memberId: participation.memberId,
    };
    // Let a failed confirmation email retry without creating a second ledger row or restoring a canceled pass.
    if (existing) return existing.status === "paid" && locked.status === "confirmed" ? { ...confirmationDetails, confirmationCode: existing.confirmationCode ?? confirmationCode } : null;

    if (!needsReview) await transaction
      .update(eventParticipations)
      .set({
        status: "confirmed",
        stripePaymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      })
      .where(eq(eventParticipations.id, participation.id));

    await transaction.update(memberNotifications).set({ readAt: new Date() }).where(eq(memberNotifications.resourceId, participation.id));

    const baseAmountCents = Number(paymentIntent.metadata.baseAmountCents) || participation.grossCents;
    const checkout = eventCustomerCheckoutCents(baseAmountCents);
    const grossCents = paymentIntent.amount_received || checkout.totalCents;
    const platformFeeCents = Number(paymentIntent.metadata.platformFeeCents) || checkout.platformFeeCents;
    const processingFeeCents = Number(paymentIntent.metadata.processingFeeCents) || checkout.processingFeeCents;
    const customerFeeCents = Number(paymentIntent.metadata.customerFeeCents) || Math.max(0, grossCents - baseAmountCents);
    await transaction
      .insert(eventTransactions)
      .values({
        eventId: participation.eventId,
        participationId: participation.id,
        memberId: participation.memberId,
        hostMemberId: participation.hostMemberId,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: paymentIntent.id,
        confirmationCode,
        grossCents,
        platformFeeCents,
        processingFeeCents,
        customerFeeCents,
        hostNetCents: baseAmountCents,
        currency: paymentIntent.currency,
        status: needsReview ? "refund_required" : "paid",
        paidAt: new Date(),
      })
      .onConflictDoNothing({ target: eventTransactions.stripePaymentIntentId });
    if (needsReview) {
      const [payment] = await transaction.select({ id: eventTransactions.id }).from(eventTransactions).where(eq(eventTransactions.stripePaymentIntentId, paymentIntent.id));
      const [review] = await transaction.insert(eventRefundRequests).values({ transactionId: payment.id, memberId: participation.memberId, reason: "Automatic review: payment completed after the booking became inactive. Attendance was not restored. Review and refund this payment." }).onConflictDoNothing().returning({ id: eventRefundRequests.id });
      if (participation.hostMemberId) await transaction.insert(memberNotifications).values({ memberId: participation.hostMemberId, type: "payment_review", title: "Payment needs a refund review", message: `A payment arrived after a booking was canceled for ${participation.eventTitle}. Open this event’s Refunds tab; attendance has not been restored.`, href: "/dashboard#events", resourceId: review?.id ?? participation.id });
    }
    return needsReview ? null : confirmationDetails;
  });

  if (confirmation) {
    const details = confirmation;
    const [claimed] = await db
      .update(eventParticipations)
      .set({ confirmationEmailSentAt: new Date(), updatedAt: new Date() })
      .where(and(eq(eventParticipations.id, details.participationId), isNull(eventParticipations.confirmationEmailSentAt)))
      .returning({ id: eventParticipations.id });
    if (claimed) {
      try {
        await sendEventConfirmationEmail({
          email: details.email,
          name: details.name,
          eventTitle: details.eventTitle,
          startsAt: details.startsAt,
          endsAt: details.endsAt,
          location: details.location,
          pathLabel: details.pathType === "attendee" ? "General attendee" : details.pathType,
          eventSlug: details.eventSlug,
          confirmationCode: details.confirmationCode,
          passHref: details.memberId ? `/passes/${details.participationId}` : undefined,
        });
      } catch (error) {
        await db.update(eventParticipations).set({ confirmationEmailSentAt: null, updatedAt: new Date() }).where(eq(eventParticipations.id, details.participationId));
        throw error;
      }
    }
  }
  return true;
}
