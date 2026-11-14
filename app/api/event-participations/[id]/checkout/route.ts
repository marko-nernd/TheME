import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db as database } from "@/db";
import { eventParticipations, events, hostPayoutAccounts } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getTestStripe } from "@/lib/host-payouts";
import { randomUUID } from "node:crypto";
import { uuidPattern } from "@/lib/event-pass";
import { eventCustomerCheckoutCents } from "@/lib/platform-fees";
import { assertTransition } from "@/lib/workflow";
import { hashToken } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  try {
    const body = await request.json().catch(() => ({}));
    const guestToken = typeof body.guestToken === "string" ? body.guestToken : "";
    const { id } = await params;
    if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });
    const [reference] = await database.select({ eventId: eventParticipations.eventId }).from(eventParticipations).where(eq(eventParticipations.id, id)).limit(1);
    if (!reference) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    return await database.transaction(async (db) => {
    await db.select({ id: events.id }).from(events).where(eq(events.id, reference.eventId)).for("update");
    const [record] = await db
      .select({
        id: eventParticipations.id,
        memberId: eventParticipations.memberId,
        applicantEmail: eventParticipations.applicantEmail,
        guestAccessTokenHash: eventParticipations.guestAccessTokenHash,
        pathType: eventParticipations.pathType,
        status: eventParticipations.status,
        priceCents: eventParticipations.priceCents,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventId: events.id,
        hostId: events.ownerId,
        eventEndsAt: events.endsAt,
        eventStartsAt: events.startsAt,
        checkoutAttempt: eventParticipations.checkoutAttempt,
        externalEventUrl: events.externalEventUrl,
        redirectToExternal: events.redirectToExternal,
        stripePaymentIntentId: eventParticipations.stripePaymentIntentId,
      })
      .from(eventParticipations)
      .innerJoin(events, eq(eventParticipations.eventId, events.id))
      .where(eq(eventParticipations.id, (await params).id))
      .for("update")
      .limit(1);
    const memberAuthorized = Boolean(member?.emailVerifiedAt && record?.memberId === member.id);
    const guestAuthorized = Boolean(record && !record.memberId && guestToken && record.guestAccessTokenHash === hashToken(guestToken));
    if (!memberAuthorized && !guestAuthorized) {
      return NextResponse.json({ error: "Payment access is invalid or has expired." }, { status: 401 });
    }
    if (!record || !["approved", "awaiting_payment"].includes(record.status)) {
      return NextResponse.json({ error: "This request is not ready for payment." }, { status: 400 });
    }
    if (record.status === "approved") {
      assertTransition("participation", record.status, "awaiting_payment");
    }
    if (record.redirectToExternal && record.externalEventUrl) {
      return NextResponse.json({ url: record.externalEventUrl, external: true });
    }
    if (record.priceCents < 50) {
      return NextResponse.json({ error: "No payment is required." }, { status: 400 });
    }
    if ((record.eventEndsAt ?? record.eventStartsAt).getTime() < Date.now()) return NextResponse.json({ error: "This event has ended. Payment is closed." }, { status: 409 });
    const stripe = getTestStripe();
    const checkout = eventCustomerCheckoutCents(record.priceCents);
    let paymentIntent =
      record.stripePaymentIntentId
        ? await stripe.paymentIntents.retrieve(record.stripePaymentIntentId)
        : null;
    if (paymentIntent?.livemode) throw new Error("Live payments are not enabled.");
    if (paymentIntent?.status === "succeeded") return NextResponse.json({ alreadyPaid: true });
    if (paymentIntent?.status === "processing") return NextResponse.json({ error: "This payment is still processing. Do not make another payment." }, { status: 409 });
    let attempt = record.checkoutAttempt;
    if (paymentIntent && (paymentIntent.status === "canceled" || paymentIntent.amount !== checkout.totalCents)) {
      if (paymentIntent.status !== "canceled") await stripe.paymentIntents.cancel(paymentIntent.id, {}, { idempotencyKey: `replace-event-payment-${paymentIntent.id}` });
      attempt = randomUUID();
      await db.update(eventParticipations).set({ checkoutAttempt: attempt }).where(eq(eventParticipations.id, record.id));
      paymentIntent = null;
    }
    if (!paymentIntent) {
      const [payout] = record.hostId ? await db.select().from(hostPayoutAccounts).where(eq(hostPayoutAccounts.memberId, record.hostId)).limit(1) : [];
      const destination = payout?.chargesEnabled && payout.payoutsEnabled ? payout.stripeAccountId : null;
      paymentIntent = await stripe.paymentIntents.create({
        amount: checkout.totalCents,
        currency: "usd",
        receipt_email: record.applicantEmail,
        automatic_payment_methods: { enabled: true },
        description: `${record.eventTitle} — ${record.pathType} participation`,
        ...(destination ? { transfer_data: { destination, amount: checkout.baseAmountCents } } : {}),
        metadata: {
          kind: "event_participation",
          participationId: record.id,
          eventId: record.eventId,
          memberId: record.memberId ?? "guest",
          baseAmountCents: String(checkout.baseAmountCents),
          platformFeeCents: String(checkout.platformFeeCents),
          processingFeeCents: String(checkout.processingFeeCents),
          customerFeeCents: String(checkout.customerFeeCents),
          payoutDestination: destination ?? "platform-held-test",
        },
      }, { idempotencyKey: `event-payment-${record.id}-${attempt}` });
    }
    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret.");
    }
    await db
      .update(eventParticipations)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        status: "awaiting_payment",
        updatedAt: new Date(),
      })
      .where(eq(eventParticipations.id, record.id));
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      eventTitle: record.eventTitle,
      eventSlug: record.eventSlug,
      pathType: record.pathType,
      amountCents: checkout.totalCents,
      baseAmountCents: checkout.baseAmountCents,
      platformFeeCents: checkout.platformFeeCents,
      processingFeeCents: checkout.processingFeeCents,
      customerFeeCents: checkout.customerFeeCents,
      currency: "usd",
    });
    });
  } catch (error) {
    console.error("Event checkout failed", error);
    const stripeConfigured =
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_");
    return NextResponse.json(
      {
        error: stripeConfigured
          ? "Could not initialize event payment. Please try again."
          : "Event payment is not configured. Add Stripe test credentials.",
      },
      { status: 503 },
    );
  }
}
