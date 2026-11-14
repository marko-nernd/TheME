import Link from "next/link";
import { redirect } from "next/navigation";
import BillingPortalButton from "@/components/billing-portal-button";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getCurrentMember } from "@/lib/auth";
import { syncStripeSubscription } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; subscription_id?: string }>;
}) {
  const {
    session_id: sessionId,
    subscription_id: subscriptionIdFromElement,
  } = await searchParams;
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) redirect("/login");
  let checkoutStatus = "processing";
  let email = "";
  let canManageBilling = false;
  let billingInterval = "monthly";

  if (subscriptionIdFromElement?.startsWith("sub_")) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(subscriptionIdFromElement);
      if (subscription.metadata.memberId !== member.id) {
        checkoutStatus = "unverified";
      } else {
        await syncStripeSubscription(subscription, member.email);
        checkoutStatus = subscription.status;
        billingInterval = subscription.metadata.billingInterval === "year" ? "annual" : "monthly";
        email = member.email;
        canManageBilling = ["active", "trialing", "past_due"].includes(subscription.status);
      }
    } catch {
      checkoutStatus = "unverified";
    }
  } else if (sessionId?.startsWith("cs_")) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      const belongsToMember =
        session.mode === "subscription" &&
        session.client_reference_id === member.id;
      if (!belongsToMember) {
        checkoutStatus = "unverified";
      } else {
        checkoutStatus = session.payment_status;
        billingInterval = session.metadata?.billingInterval === "year" ? "annual" : "monthly";
        email = session.customer_details?.email ?? session.customer_email ?? member.email;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          await syncStripeSubscription(
            await getStripe().subscriptions.retrieve(subscriptionId),
            member.email,
          );
          canManageBilling = true;
        }
      }
    } catch {
      checkoutStatus = "unverified";
    }
  }

  return (
    <main>
      <SiteHeader inner />
      <section className="billing-success" id="top">
        <span className="billing-check">✓</span>
        <p className="eyebrow light">
          <span /> {billingInterval} membership
        </p>
        <h1>Your subscription is being activated.</h1>
        <p>
          Stripe reported the checkout as <strong>{checkoutStatus}</strong>
          {email ? ` for ${email}` : ""}. The signed webhook is the final source
          of truth for access.
        </p>
        <div className="billing-success-actions">
          {canManageBilling && <BillingPortalButton />}
          <Link className="quiet-link" href="/dashboard">
            Continue to dashboard →
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
