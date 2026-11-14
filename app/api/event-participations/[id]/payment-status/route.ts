import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipations } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { finalizeEventPayment } from "@/lib/event-payments";
import { getStripe } from "@/lib/stripe";
import { hashToken } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  const body = await request.json().catch(() => ({}));
  const guestToken = typeof body.guestToken === "string" ? body.guestToken : "";
  const [record] = await db
    .select({ memberId: eventParticipations.memberId, paymentIntentId: eventParticipations.stripePaymentIntentId, guestAccessTokenHash: eventParticipations.guestAccessTokenHash })
    .from(eventParticipations)
    .where(eq(eventParticipations.id, (await params).id))
    .limit(1);
  const memberAuthorized = Boolean(member?.emailVerifiedAt && record?.memberId === member.id);
  const guestAuthorized = Boolean(record && !record.memberId && guestToken && record.guestAccessTokenHash === hashToken(guestToken));
  if (!memberAuthorized && !guestAuthorized) {
    return NextResponse.json({ error: "Payment access is invalid or has expired." }, { status: 401 });
  }
  if (!record?.paymentIntentId) {
    return NextResponse.json({ error: "Payment was not found." }, { status: 404 });
  }
  try {
    const paymentIntent = await getStripe().paymentIntents.retrieve(record.paymentIntentId);
    if (paymentIntent.status === "succeeded") {
      await finalizeEventPayment(paymentIntent);
    }
    return NextResponse.json({ status: paymentIntent.status });
  } catch (error) {
    console.error("Payment status sync failed", error);
    return NextResponse.json({ error: "Could not verify the payment." }, { status: 503 });
  }
}
