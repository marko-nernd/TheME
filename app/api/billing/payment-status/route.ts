import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { syncStripeSubscription } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Verified member account required." }, { status: 401 });
  }
  const body = await request.json();
  const subscriptionId = String(body.subscriptionId ?? "");
  if (!subscriptionId.startsWith("sub_")) {
    return NextResponse.json({ error: "Subscription was not found." }, { status: 400 });
  }
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    if (subscription.metadata.memberId !== member.id) {
      return NextResponse.json({ error: "Subscription was not found." }, { status: 404 });
    }
    await syncStripeSubscription(subscription, member.email);
    return NextResponse.json({ status: subscription.status });
  } catch (error) {
    console.error("Subscription status sync failed", error);
    return NextResponse.json({ error: "Could not verify the membership payment." }, { status: 503 });
  }
}
