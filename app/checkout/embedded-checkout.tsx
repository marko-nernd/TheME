"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { BillingInterval, MembershipPlanKey } from "@/lib/membership-plans";
import { getModelEscapeStripeAppearance } from "@/lib/stripe-appearance";

function MembershipPaymentForm({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  const syncStatus = useCallback(async () => {
    const response = await fetch("/api/billing/payment-status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error ?? "Could not verify the membership payment.");
    }
    return result.status as string;
  }, [subscriptionId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setMessage("");
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing/success?subscription_id=${encodeURIComponent(subscriptionId)}`,
      },
      redirect: "if_required",
    });
    if (result.error) {
      setMessageType("error");
      setMessage(result.error.message ?? "Membership payment could not be completed.");
      setSubmitting(false);
      return;
    }
    try {
      const status = await syncStatus();
      if (status === "active" || status === "trialing") {
        setMessageType("success");
        setMessage("Payment successful. Your membership is active.");
      } else {
        setMessageType("info");
        setMessage("Your payment is processing. Membership access will update automatically.");
      }
    } catch (caught) {
      setMessageType("error");
      setMessage(caught instanceof Error ? caught.message : "Could not verify the membership payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="payment-element-form membership-payment-form" onSubmit={submit}>
      <PaymentElement options={{ layout: "tabs" }} />
      <button className="button payment-element-submit" type="submit" disabled={!stripe || submitting}>
        {submitting ? "Activating membership…" : "Start membership"}
      </button>
      {message && (
        <div className={`payment-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>
          {message}
          {messageType === "success" && <a href="/dashboard">View dashboard →</a>}
        </div>
      )}
    </form>
  );
}

export default function EmbeddedMembershipCheckout({
  plan,
  billingInterval,
  publishableKey,
}: {
  plan: MembershipPlanKey;
  billingInterval: BillingInterval;
  publishableKey: string;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );
  const [clientSecret, setClientSecret] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan, billingInterval }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to start secure checkout.");
        if (!result.clientSecret || !result.subscriptionId) {
          throw new Error("Stripe did not return the membership payment form.");
        }
        if (active) {
          setClientSecret(result.clientSecret);
          setSubscriptionId(result.subscriptionId);
        }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to start secure checkout.");
      });
    return () => {
      active = false;
    };
  }, [billingInterval, plan]);

  if (!publishableKey) {
    return <div className="checkout-error">Stripe test mode is not configured.</div>;
  }
  if (error) return <div className="checkout-error" role="alert">{error}</div>;
  if (!stripePromise || !clientSecret || !subscriptionId) {
    return <div className="payment-element-loading" role="status">Preparing secure membership payment…</div>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: getModelEscapeStripeAppearance(),
        loader: "auto",
      }}
    >
      <MembershipPaymentForm subscriptionId={subscriptionId} />
    </Elements>
  );
}
