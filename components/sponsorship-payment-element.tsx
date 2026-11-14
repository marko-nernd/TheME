"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getModelEscapeStripeAppearance } from "@/lib/stripe-appearance";

function Form({ agreementId }: { agreementId: string }) {
  const stripe = useStripe(); const elements = useElements(); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); if (!stripe || !elements) return; setSaving(true); setMessage(""); const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/sponsorship-agreements/${agreementId}` }, redirect: "if_required" }); if (result.error) { setMessage(result.error.message || "Payment failed."); setSaving(false); return; } const response = await fetch(`/api/sponsorship-agreements/${agreementId}/payment-status`, { method: "POST" }); const status = await response.json(); setMessage(status.status === "succeeded" ? "Payment complete. The sponsorship record has been updated." : "Payment is processing."); setSaving(false); if (status.status === "succeeded") window.location.reload(); }
  return <form className="payment-element-form" onSubmit={submit}><PaymentElement options={{ layout: "tabs" }} /><button className="button payment-element-submit" disabled={!stripe || saving}>{saving ? "Processing…" : "Pay sponsorship securely"}</button>{message && <p role="status">{message}</p>}</form>;
}

export default function SponsorshipPaymentElement({ agreementId, publishableKey }: { agreementId: string; publishableKey: string }) {
  const stripe = useMemo(() => publishableKey ? loadStripe(publishableKey) : null, [publishableKey]); const [secret, setSecret] = useState(""); const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/sponsorship-agreements/${agreementId}/checkout`, { method: "POST" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to open payment."); if (data.paid) { window.location.reload(); return; } setSecret(data.clientSecret); }).catch((caught) => setError(caught.message)); }, [agreementId]);
  if (!publishableKey) return <p className="form-error">Stripe test mode is not configured.</p>; if (error) return <p className="form-error">{error}</p>; if (!stripe || !secret) return <p>Preparing secure sponsorship payment…</p>;
  return <Elements stripe={stripe} options={{ clientSecret: secret, appearance: getModelEscapeStripeAppearance() }}><Form agreementId={agreementId} /></Elements>;
}
