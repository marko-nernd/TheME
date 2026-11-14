"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import SponsorshipPaymentElement from "@/components/sponsorship-payment-element";

type Agreement = {
  id: string; terms: string; status: string; contributionType: string; cashAmount: string;
  organizerAccepted: boolean; sponsorAccepted: boolean; beneficiaryAccepted: boolean; beneficiaryRequired: boolean;
  isOrganizer: boolean; isSponsor: boolean; isBeneficiary: boolean; paymentStatus: string; inKindStatus: string;
  fulfillmentNotes: string; publishableKey: string;
};

export default function SponsorshipAgreementForm({ agreement }: { agreement: Agreement }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function update(action: string, body: Record<string, unknown> = {}) {
    setSaving(true); setMessage("");
    const response = await fetch(`/api/sponsorship-agreements/${agreement.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...body }) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(result.error || "Agreement could not be updated.");
    router.refresh();
  }
  function accept(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); void update("accept_terms", { terms: data.get("terms") }); }
  function deliver(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); void update("mark_delivered", { fulfillmentNotes: data.get("fulfillmentNotes") }); }
  const signaturesComplete = agreement.organizerAccepted && agreement.sponsorAccepted && (!agreement.beneficiaryRequired || agreement.beneficiaryAccepted);
  return <div className="agreement-workspace">
    <form className="agreement-form" onSubmit={accept}>
      <div className="agreement-summary"><span>{agreement.contributionType.replaceAll("_", " ")}</span><strong>{agreement.cashAmount}</strong><small>Status: {agreement.status.replaceAll("_", " ")}</small></div>
      <label>Final deliverables, placement, travel, representation, usage rights, dates, and cancellation terms<textarea name="terms" rows={12} defaultValue={agreement.terms} required minLength={20} maxLength={5000} /></label>
      <div className="agreement-signatures"><span className={agreement.organizerAccepted ? "accepted" : ""}>Host {agreement.organizerAccepted ? "✓ accepted" : "pending"}</span><span className={agreement.sponsorAccepted ? "accepted" : ""}>Sponsor {agreement.sponsorAccepted ? "✓ accepted" : "pending"}</span>{agreement.beneficiaryRequired && <span className={agreement.beneficiaryAccepted ? "accepted" : ""}>Sponsored member {agreement.beneficiaryAccepted ? "✓ accepted" : "pending"}</span>}</div>
      {!agreement.status.includes("completed") && <button className="button" disabled={saving}>{saving ? "Saving…" : agreement.isOrganizer ? "Save and accept as host" : agreement.isBeneficiary ? "Save and accept as sponsored member" : "Save and accept as sponsor"}</button>}{message && <p className="form-error">{message}</p>}
    </form>
    {signaturesComplete && <section className="agreement-fulfillment"><header><span>PAYMENT &amp; DELIVERY</span><h2>Fulfill the agreement</h2></header>
      {agreement.paymentStatus !== "not_required" && <div><h3>Cash sponsorship · {agreement.paymentStatus.replaceAll("_", " ")}</h3>{agreement.isSponsor && agreement.paymentStatus !== "paid" ? <SponsorshipPaymentElement agreementId={agreement.id} publishableKey={agreement.publishableKey} /> : <p>{agreement.paymentStatus === "paid" ? "Payment received and recorded." : "The sponsor completes the secure payment from this page."}</p>}</div>}
      {agreement.inKindStatus !== "not_required" && <div><h3>Products or services · {agreement.inKindStatus.replaceAll("_", " ")}</h3>{agreement.fulfillmentNotes && <p><strong>Delivery details:</strong> {agreement.fulfillmentNotes}</p>}{agreement.isSponsor && agreement.inKindStatus !== "confirmed" ? <form onSubmit={deliver}><label>Delivery details<textarea name="fulfillmentNotes" rows={4} minLength={10} maxLength={3000} defaultValue={agreement.fulfillmentNotes} placeholder="What was delivered, how, when, tracking information, and any proof link." required /></label><button className="button" disabled={saving}>{agreement.inKindStatus === "delivered" ? "Update delivery details" : "Mark contribution delivered"}</button></form> : agreement.inKindStatus === "delivered" && (agreement.isOrganizer || agreement.isBeneficiary) ? <button className="button" type="button" disabled={saving} onClick={() => void update("confirm_delivery")}>Confirm delivery received</button> : <p>{agreement.inKindStatus === "confirmed" ? "Delivery confirmed by the recipient." : "Waiting for the sponsor to record delivery."}</p>}</div>}
    </section>}
  </div>;
}
