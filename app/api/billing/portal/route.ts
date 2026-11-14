import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { billingCustomers } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getSiteUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    const member = await getCurrentMember();
    if (!member?.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Sign in to manage billing." },
        { status: 401 },
      );
    }
    const [customer] = await db
      .select({ stripeCustomerId: billingCustomers.stripeCustomerId })
      .from(billingCustomers)
      .where(
        or(
          eq(billingCustomers.memberId, member.id),
          eq(billingCustomers.email, member.email),
        ),
      )
      .limit(1);
    if (!customer) {
      return NextResponse.json(
        { error: "No billing account was found. Choose a paid plan first." },
        { status: 404 },
      );
    }

    const portal = await getStripe().billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: `${getSiteUrl()}/dashboard`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Stripe portal creation failed", error);
    return NextResponse.json(
      { error: "Billing management is temporarily unavailable." },
      { status: 503 },
    );
  }
}
