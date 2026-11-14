import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sponsorshipAgreements } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { finalizeSponsorshipPayment } from "@/lib/sponsorship-payments";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember(); if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const [agreement] = await db.select().from(sponsorshipAgreements).where(and(eq(sponsorshipAgreements.id, id), eq(sponsorshipAgreements.sponsorMemberId, member.id))).limit(1);
  if (!agreement || agreement.status !== "confirmed" || agreement.paymentStatus === "paid") return NextResponse.json({ error: "This sponsorship is not ready for payment." }, { status: 400 });
  if (agreement.cashAmountCents < 50 || !["cash", "hybrid"].includes(agreement.contributionType)) return NextResponse.json({ error: "No cash payment is required." }, { status: 400 });
  const stripe = getStripe();
  let paymentIntent = agreement.stripePaymentIntentId ? await stripe.paymentIntents.retrieve(agreement.stripePaymentIntentId) : null;
  if (paymentIntent?.status === "succeeded") {
    await finalizeSponsorshipPayment(paymentIntent);
    return NextResponse.json({ paid: true });
  }
  if (!paymentIntent || paymentIntent.status === "canceled" || paymentIntent.amount !== agreement.cashAmountCents) {
    paymentIntent = await stripe.paymentIntents.create({ amount: agreement.cashAmountCents, currency: "usd", receipt_email: member.email, automatic_payment_methods: { enabled: true }, description: "Model Escape sponsorship", metadata: { kind: "sponsorship_agreement", agreementId: agreement.id, memberId: member.id } });
  }
  if (!paymentIntent.client_secret) return NextResponse.json({ error: "Stripe did not return a payment form." }, { status: 502 });
  await db.update(sponsorshipAgreements).set({ stripePaymentIntentId: paymentIntent.id, paymentStatus: paymentIntent.status === "succeeded" ? "paid" : "pending", updatedAt: new Date() }).where(eq(sponsorshipAgreements.id, agreement.id));
  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
