import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { billingCustomers, subscriptions } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { syncStripeSubscription, upsertBillingCustomer } from "@/lib/billing";
import { getStripe, getStripePriceId } from "@/lib/stripe";
import {
  findMembershipPlan,
  membershipGroupForRole,
  type BillingInterval,
  type MembershipPlanKey,
} from "@/lib/membership-plans";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = body.plan as MembershipPlanKey;
    const billingInterval: BillingInterval = body.billingInterval === "year" ? "year" : "month";
    const member = await getCurrentMember();

    if (!member?.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Sign in with a verified account to choose a membership." },
        { status: 401 },
      );
    }
    const planDefinition = findMembershipPlan(plan);
    if (
      !planDefinition ||
      planDefinition.group !== membershipGroupForRole(member.primaryRole)
    ) {
      return NextResponse.json({ error: "Choose a paid plan." }, { status: 400 });
    }
    const [activeSubscription] = await db.select({ id: subscriptions.id }).from(subscriptions).innerJoin(billingCustomers, eq(subscriptions.billingCustomerId, billingCustomers.id)).where(and(eq(billingCustomers.memberId, member.id), inArray(subscriptions.status, ["active", "trialing", "past_due", "unpaid"]))).limit(1);
    if (activeSubscription) return NextResponse.json({ error: "You already have a membership. Use Change plan to update your existing subscription.", manageExisting: true }, { status: 409 });

    const stripe = getStripe();
    const priceId = await getStripePriceId(plan, billingInterval);
    const [billingCustomer] = await db
      .select({
        id: billingCustomers.id,
        stripeCustomerId: billingCustomers.stripeCustomerId,
      })
      .from(billingCustomers)
      .where(eq(billingCustomers.memberId, member.id))
      .limit(1);
    let stripeCustomerId = billingCustomer?.stripeCustomerId;
    let billingCustomerId = billingCustomer?.id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: member.name,
        metadata: { memberId: member.id },
      });
      const stored = await upsertBillingCustomer(customer.id, member.email);
      stripeCustomerId = customer.id;
      billingCustomerId = stored.id;
    }

    const [storedIncomplete] = billingCustomerId
      ? await db
          .select({ stripeSubscriptionId: subscriptions.stripeSubscriptionId })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.billingCustomerId, billingCustomerId),
              eq(subscriptions.stripePriceId, priceId),
              eq(subscriptions.status, "incomplete"),
            ),
          )
          .limit(1)
      : [];

    let subscription = storedIncomplete
      ? await stripe.subscriptions.retrieve(storedIncomplete.stripeSubscriptionId, {
          expand: ["latest_invoice.confirmation_secret"],
        })
      : null;
    if (
      !subscription ||
      subscription.status !== "incomplete"
    ) {
      subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId, quantity: 1 }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        billing_mode: { type: "flexible" },
        metadata: { plan, billingInterval, memberId: member.id },
        expand: ["latest_invoice.confirmation_secret"],
      });
      await syncStripeSubscription(subscription, member.email);
    }

    const invoice =
      typeof subscription.latest_invoice === "string"
        ? await stripe.invoices.retrieve(subscription.latest_invoice, {
            expand: ["confirmation_secret"],
          })
        : subscription.latest_invoice;
    const clientSecret = invoice?.confirmation_secret?.client_secret;
    if (!clientSecret) {
      throw new Error("Stripe did not return the subscription payment client secret.");
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      type: "payment",
    });
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    const message =
      error instanceof Error && error.message.includes("not configured")
        ? error.message
        : "Checkout is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
