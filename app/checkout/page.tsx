import Link from "next/link";
import { redirect } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getCurrentMember } from "@/lib/auth";
import {
  annualCents,
  annualDiscountForPlan,
  findMembershipPlan,
  membershipGroupForRole,
  type BillingInterval,
} from "@/lib/membership-plans";
import EmbeddedMembershipCheckout from "./embedded-checkout";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; interval?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) redirect("/login?next=/membership");
  const query = await searchParams;
  const plan = findMembershipPlan(query.plan ?? "");
  const billingInterval: BillingInterval = query.interval === "year" ? "year" : "month";
  if (!plan || plan.group !== membershipGroupForRole(member.primaryRole)) {
    redirect("/membership");
  }
  const amount = billingInterval === "year" ? annualCents(plan) : plan.monthlyCents;
  const annualDiscount = Math.round(annualDiscountForPlan(plan) * 100);

  return (
    <main className="embedded-checkout-page">
      <SiteHeader inner />
      <section className="embedded-checkout-heading" id="top">
        <div>
          <p className="eyebrow light"><span />Secure membership checkout</p>
          <h1>{plan.name}<br /><em>Membership plan.</em></h1>
        </div>
        <div className="checkout-order-summary">
          <span>{billingInterval === "year" ? `Annual membership · ${annualDiscount}% off` : "Monthly membership"}</span>
          <strong>{money.format(amount / 100)}</strong>
          <small>{billingInterval === "year" ? "billed once per year" : "billed monthly"}</small>
          <Link href="/membership">← Change plan</Link>
        </div>
      </section>
      <section className="embedded-checkout-shell membership-element-shell">
        <EmbeddedMembershipCheckout
          plan={plan.key}
          billingInterval={billingInterval}
          publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
        />
        <p>Payment details go directly to Stripe and are never stored by Model Escape.</p>
      </section>
      <SiteFooter />
    </main>
  );
}
