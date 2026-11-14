import Stripe from "stripe";
import {
  lookupKey,
  type BillingInterval,
  type MembershipPlanKey,
} from "./membership-plans";

let stripeClient: Stripe | undefined;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY.");
  }
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export async function getStripePriceId(
  plan: MembershipPlanKey,
  interval: BillingInterval,
) {
  if (interval === "month" && (plan === "creator" || plan === "pro")) {
    const legacy =
      plan === "creator"
        ? process.env.STRIPE_CREATOR_PRICE_ID
        : process.env.STRIPE_PRO_PRICE_ID;
    if (legacy) return legacy;
  }
  const [price] = (
    await getStripe().prices.list({
      lookup_keys: [lookupKey(plan, interval)],
      active: true,
      limit: 1,
    })
  ).data;
  if (!price) throw new Error(`Stripe price for ${plan} ${interval} is not configured.`);
  return price.id;
}

export function getSiteUrl() {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }
  return url.origin;
}

export function planFromPrice(priceId: string, fallback?: string) {
  if (priceId === process.env.STRIPE_CREATOR_PRICE_ID) return "creator";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return fallback || "unknown";
}
