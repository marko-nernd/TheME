import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sponsorshipAgreements } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { finalizeSponsorshipPayment } from "@/lib/sponsorship-payments";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember(); if (!member) return NextResponse.json({ error: "Sign in first." }, { status: 401 }); const { id } = await params;
  const [agreement] = await db.select().from(sponsorshipAgreements).where(and(eq(sponsorshipAgreements.id, id), or(eq(sponsorshipAgreements.organizerMemberId, member.id), eq(sponsorshipAgreements.sponsorMemberId, member.id), eq(sponsorshipAgreements.beneficiaryMemberId, member.id)))).limit(1);
  if (!agreement?.stripePaymentIntentId) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  const intent = await getStripe().paymentIntents.retrieve(agreement.stripePaymentIntentId); if (intent.status === "succeeded") await finalizeSponsorshipPayment(intent);
  return NextResponse.json({ status: intent.status });
}
