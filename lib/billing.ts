import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  billingCustomers,
  members,
  profiles,
  subscriptions,
} from "@/db/schema";
import { getStripe, planFromPrice } from "./stripe";
import { findMembershipPlan } from "./membership-plans";

function stripeId(value: string | { id: string } | null) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function upsertBillingCustomer(
  stripeCustomerId: string,
  knownEmail?: string | null,
) {
  let email = knownEmail?.trim().toLowerCase() || "";
  if (!email) {
    const customer = await getStripe().customers.retrieve(stripeCustomerId);
    if (customer.deleted || !customer.email) {
      throw new Error("Stripe customer does not have a billing email.");
    }
    email = customer.email.toLowerCase();
  }

  const [member] = await db
    .select({
      id: members.id,
      membershipTierOverride: members.membershipTierOverride,
    })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  const [customer] = await db
    .insert(billingCustomers)
    .values({ stripeCustomerId, email, memberId: member?.id ?? null })
    .onConflictDoUpdate({
      target: billingCustomers.stripeCustomerId,
      set: { email, memberId: member?.id ?? null, updatedAt: new Date() },
    })
    .returning();

  return customer;
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  knownEmail?: string | null,
) {
  const stripeCustomerId = stripeId(subscription.customer);
  const item = subscription.items.data[0];
  if (!stripeCustomerId || !item) {
    throw new Error("Stripe subscription is missing its customer or price.");
  }

  const customer = await upsertBillingCustomer(stripeCustomerId, knownEmail);
  const stripeProductId = stripeId(item.price.product);
  if (!stripeProductId) {
    throw new Error("Stripe subscription price is missing its product.");
  }

  const values = {
    billingCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    stripeProductId,
    stripePriceId: item.price.id,
    plan: planFromPrice(item.price.id, subscription.metadata.plan),
    status: subscription.status,
    currentPeriodStart: item.current_period_start
      ? new Date(item.current_period_start * 1000)
      : null,
    currentPeriodEnd: item.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    latestInvoiceId: stripeId(subscription.latest_invoice),
    updatedAt: new Date(),
  };

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: values,
    });

  const [member] = await db
    .select({
      id: members.id,
      membershipTierOverride: members.membershipTierOverride,
    })
    .from(members)
    .where(eq(members.email, customer.email))
    .limit(1);
  if (member) {
    const plan = findMembershipPlan(values.plan);
    const creativeOverride = ["profile", "creator", "silver", "gold", "platinum", "diamond"].includes(member.membershipTierOverride ?? "")
      ? member.membershipTierOverride
      : null;
    const isPaid =
      ["active", "trialing", "past_due"].includes(subscription.status) &&
      (plan?.group === "creative" || values.plan === "pro");
    await db
      .update(profiles)
      .set({
        membershipTier: creativeOverride ?? (isPaid ? values.plan : "profile"),
        updatedAt: new Date(),
      })
      .where(eq(profiles.memberId, member.id));
  }
}

export async function updateInvoiceStatus(
  stripeSubscriptionId: string,
  status: "paid" | "failed",
  invoiceId: string,
) {
  await db
    .update(subscriptions)
    .set({
      lastPaymentStatus: status,
      latestInvoiceId: invoiceId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

export function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const legacy = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null;
  };
  const direct = stripeId(legacy.subscription ?? null);
  if (direct) return direct;

  const parent = invoice.parent?.subscription_details?.subscription;
  return parent ? stripeId(parent) : null;
}
