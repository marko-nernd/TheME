"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getModelEscapeStripeAppearance } from "@/lib/stripe-appearance";

function PaymentForm({ participationId, guestToken, successHref, amountCents }: { participationId: string; guestToken?: string; successHref: string; amountCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  const syncStatus = useCallback(async () => {
    const response = await fetch(
      `/api/event-participations/${participationId}/payment-status`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ guestToken }) },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not verify the payment.");
    return result.status as string;
  }, [guestToken, participationId]);

  useEffect(() => {
    if (!stripe) return;
    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret",
    );
    if (!clientSecret) return;
    stripe.retrievePaymentIntent(clientSecret).then(async ({ paymentIntent, error }) => {
      if (error) {
        setMessageType("error");
        setMessage(error.message ?? "Could not retrieve the payment.");
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        try {
          await syncStatus();
          setMessageType("success");
          setMessage("Payment successful. Your event place is confirmed.");
        } catch (caught) {
          setMessageType("error");
          setMessage(caught instanceof Error ? caught.message : "Could not verify the payment.");
        }
      }
    });
  }, [stripe, syncStatus]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/event/${participationId}${guestToken ? `?token=${encodeURIComponent(guestToken)}` : ""}`,
      },
      redirect: "if_required",
    });
    if (result.error) {
      setMessageType("error");
      setMessage(result.error.message ?? "Payment could not be completed.");
      setSubmitting(false);
      return;
    }
      const status = await syncStatus();
      if (status === "succeeded") {
        setMessageType("success");
        setMessage("Payment successful. Your event place is confirmed.");
      } else {
        setMessageType("info");
        setMessage("Your payment is processing. We will update your dashboard when it completes.");
      }
    } catch (caught) {
      setMessageType("error");
      setMessage(caught instanceof Error ? caught.message : "Could not verify the payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="payment-element-form" onSubmit={submit}>
      <PaymentElement options={{ layout: "tabs" }} />
      <button className="button payment-element-submit" type="submit" disabled={!stripe || submitting || messageType === "success"}>
        {submitting ? "Processing securely…" : messageType === "success" ? "Paid ✓" : `Pay ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100)} →`}
      </button>
      {message && (
        <div className={`payment-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>
          {message}
          {messageType === "success" && <a href={successHref}>View my event pass →</a>}
        </div>
      )}
    </form>
  );
}

export default function EventPaymentElement({
  participationId,
  publishableKey,
  guestToken,
  successHref = "/dashboard",
}: {
  participationId: string;
  publishableKey: string;
  guestToken?: string;
  successHref?: string;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );
  const [clientSecret, setClientSecret] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/event-participations/${participationId}/checkout`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ guestToken }) })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to start secure payment.");
        if (result.alreadyPaid) {
          const synced = await fetch(`/api/event-participations/${participationId}/payment-status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ guestToken }) });
          if (!synced.ok) throw new Error("Payment received, but confirmation is still syncing. Refresh shortly; do not pay again.");
          window.location.assign(`/passes/${participationId}${guestToken ? `?token=${encodeURIComponent(guestToken)}` : ""}`);
          return;
        }
        if (result.external && result.url) {
          window.location.assign(result.url);
          return;
        }
        if (!result.clientSecret) throw new Error("Stripe did not return a payment form.");
        if (active) { setClientSecret(result.clientSecret); setAmountCents(result.amountCents); }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to start secure payment.");
      });
    return () => {
      active = false;
    };
  }, [guestToken, participationId]);

  if (!publishableKey) {
    return <div className="checkout-error">Stripe test mode is not configured.</div>;
  }
  if (error) return <div className="checkout-error" role="alert">{error}</div>;
  if (!stripePromise || !clientSecret) {
    return <div className="payment-element-loading" role="status">Preparing secure payment form…</div>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: getModelEscapeStripeAppearance(), loader: "auto" }}
    >
      <PaymentForm participationId={participationId} guestToken={guestToken} successHref={successHref.startsWith("/passes/") ? successHref : `/passes/${participationId}${guestToken ? `?token=${encodeURIComponent(guestToken)}` : ""}`} amountCents={amountCents} />
    </Elements>
  );
}
