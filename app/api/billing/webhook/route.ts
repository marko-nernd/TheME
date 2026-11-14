import { fulfillProfileCredits } from "@/lib/profile-credit-payments";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { eventParticipations, eventTransactions, events, sponsorshipAgreements, stripeWebhookEvents } from "@/db/schema";
import {
  subscriptionIdFromInvoice,
  syncStripeSubscription,
  updateInvoiceStatus,
} from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { finalizeEventPayment } from "@/lib/event-payments";
import { eventCustomerCheckoutCents } from "@/lib/platform-fees";
import { eventConfirmationCode } from "@/lib/confirmation-code";
import { finalizeSponsorshipPayment } from "@/lib/sponsorship-payments";
import { applyEventRefund } from "@/lib/event-refunds";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.warn("Rejected Stripe webhook", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.livemode) return NextResponse.json({ error: "Only test-mode Stripe events are enabled." }, { status: 400 });
    const [processed] = await db
      .select({ id: stripeWebhookEvents.stripeEventId })
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.stripeEventId, event.id))
      .limit(1);
    if (processed) return NextResponse.json({ received: true });

    if (event.type === "checkout.session.async_payment_succeeded") await fulfillProfileCredits(event.data.object);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if(session.metadata?.kind === "profile_credits") await fulfillProfileCredits(session);
      if (
        session.mode === "payment" &&
        session.payment_status === "paid" &&
        session.metadata?.kind === "event_participation" &&
        session.metadata.participationId
      ) {
        await db.transaction(async (transaction) => {
          const [participation] = await transaction
            .select({
              id: eventParticipations.id,
              memberId: eventParticipations.memberId,
              eventId: eventParticipations.eventId,
              grossCents: eventParticipations.priceCents,
              status: eventParticipations.status,
              hostMemberId: events.ownerId,
            })
            .from(eventParticipations)
            .innerJoin(events, eq(eventParticipations.eventId, events.id))
            .where(eq(eventParticipations.id, session.metadata!.participationId!))
            .limit(1);
          if (!participation) throw new Error("Paid participation not found.");
          await transaction
            .update(eventParticipations)
            .set({ status: "confirmed", updatedAt: new Date() })
            .where(and(eq(eventParticipations.id, participation.id), inArray(eventParticipations.status, ["approved", "awaiting_payment", "confirmed"])));
          const checkout = eventCustomerCheckoutCents(participation.grossCents);
          const grossCents = session.amount_total ?? checkout.totalCents;
          const platformFeeCents = checkout.platformFeeCents;
          const paymentIntent =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
          await transaction
            .insert(eventTransactions)
            .values({
              eventId: participation.eventId,
              participationId: participation.id,
              memberId: participation.memberId,
              hostMemberId: participation.hostMemberId,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: paymentIntent,
              confirmationCode: eventConfirmationCode(paymentIntent ?? session.id),
              grossCents,
              platformFeeCents,
              processingFeeCents: checkout.processingFeeCents,
              customerFeeCents: Math.max(0, grossCents - participation.grossCents),
              hostNetCents: participation.grossCents,
              currency: session.currency ?? "usd",
              status: ["cancelled", "refunded", "declined"].includes(participation.status) ? "refund_required" : "paid",
              paidAt: new Date(),
            })
            .onConflictDoNothing({ target: eventTransactions.stripeCheckoutSessionId });
        });
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (subscriptionId) {
        await syncStripeSubscription(
          await getStripe().subscriptions.retrieve(subscriptionId),
          session.customer_details?.email,
        );
      }
    } else if (event.type === "payment_intent.succeeded") {
      if (!(await finalizeSponsorshipPayment(event.data.object))) await finalizeEventPayment(event.data.object);
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      if (paymentIntent.metadata.kind === "sponsorship_agreement" && paymentIntent.metadata.agreementId) {
        await db.update(sponsorshipAgreements).set({ paymentStatus: "failed", updatedAt: new Date() }).where(eq(sponsorshipAgreements.id, paymentIntent.metadata.agreementId));
      }
      if (
        paymentIntent.metadata.kind === "event_participation" &&
        paymentIntent.metadata.participationId
      ) {
        await db
          .update(eventParticipations)
          .set({ status: "awaiting_payment", updatedAt: new Date() })
          .where(and(eq(eventParticipations.id, paymentIntent.metadata.participationId), eq(eventParticipations.stripePaymentIntentId, paymentIntent.id), inArray(eventParticipations.status, ["approved", "awaiting_payment"])));
      }
    } else if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") {
      await applyEventRefund(event.data.object);
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncStripeSubscription(event.data.object);
    } else if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      const invoice = event.data.object;
      const subscriptionId = subscriptionIdFromInvoice(invoice);
      if (subscriptionId) {
        await updateInvoiceStatus(
          subscriptionId,
          event.type === "invoice.paid" ? "paid" : "failed",
          invoice.id,
        );
      }
    }

    await db.insert(stripeWebhookEvents).values({
      stripeEventId: event.id,
      type: event.type,
    }).onConflictDoNothing();
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
