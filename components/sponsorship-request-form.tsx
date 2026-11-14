"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function SponsorshipRequestForm({
  event,
  sponsors,
  direction = "sponsor_to_event",
  targetMember,
  travelEligible = false,
  lockSponsor = false,
}: {
  event: { id: string; title: string };
  sponsors: { id: string; name: string; category: string }[];
  direction?: "sponsor_to_event" | "promoter_to_sponsor" | "sponsor_to_member";
  targetMember?: { id: string; name: string; role: string } | null;
  travelEligible?: boolean;
  lockSponsor?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setMessage("");
    const data = new FormData(formEvent.currentTarget);
    try {
    const response = await fetch("/api/sponsorship-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        targetMemberId: targetMember?.id,
        sponsorId: data.get("sponsorId"),
        direction,
        message: data.get("message"),
        contributionType: data.get("contributionType"),
        cashAmountDollars: data.get("cashAmountDollars"),
        offerDetails: data.get("offerDetails"),
        flightIncluded: data.get("flightIncluded") === "on",
        hotelIncluded: data.get("hotelIncluded") === "on",
        representationRequired: data.get("representationRequired") === "on",
        representationTerms: data.get("representationTerms"),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not send request.");
      setSaving(false);
      return;
    }
    setRequestId(result.id);
    } catch { setMessage("Connection lost. Your offer is still here. Please try again."); }
    finally { setSaving(false); }
  }

  if (requestId) {
    return <div className="sponsor-request-success"><span>OFFER SENT ✓</span><h3>Your partnership workspace is ready.</h3><p>The recipient can accept, counter, or decline. Keep negotiation, the agreement, payment, and delivery in this workspace.</p><div><Link className="button" href={`/sponsorship-requests/${requestId}`}>Open partnership workspace ↗</Link><Link href="/dashboard#activity">Return to dashboard →</Link></div></div>;
  }
  return (
    <form className="sponsorship-request-form" onSubmit={submit}>
      <h3>
        {direction === "promoter_to_sponsor"
          ? `Invite a sponsor to ${event.title}`
          : direction === "sponsor_to_member" && targetMember
            ? `Sponsor ${targetMember.name} for ${event.title}`
          : `Sponsor ${event.title}`}
      </h3>
      {lockSponsor && sponsors[0] ? <div className="sponsorship-locked-sponsor">
        <span>SPONSORING AS</span><strong>{sponsors[0].name}</strong><small>{sponsors[0].category}</small>
        <input type="hidden" name="sponsorId" value={sponsors[0].id} />
      </div> : <label>
        Sponsor
        <select name="sponsorId" required defaultValue="">
          <option value="" disabled>Choose a sponsor</option>
          {sponsors.map((sponsor) => (
            <option value={sponsor.id} key={sponsor.id}>
              {sponsor.name} · {sponsor.category}
            </option>
          ))}
        </select>
      </label>}
      {direction === "sponsor_to_member" && targetMember && (
        <fieldset className="sponsorship-support-package">
          <legend>Destination support package</legend>
          <p>Choose everything the sponsor will provide for {targetMember.name}. These items become part of the agreement.</p>
          <label><input name="flightIncluded" type="checkbox" disabled={!travelEligible} /> Round-trip flight</label>
          <label><input name="hotelIncluded" type="checkbox" disabled={!travelEligible} /> Hotel accommodation</label>
          {!travelEligible && <small>Flight and hotel support are available for destination shoots and eligible photoshoots.</small>}
          <label><input name="representationRequired" type="checkbox" /> Sponsor representation required</label>
          <label>
            Representation terms
            <textarea name="representationTerms" rows={4} maxLength={2000} placeholder="Campaign dates, appearances, tagged posts, wardrobe or product use, content rights, exclusivity, and approval requirements." />
          </label>
        </fieldset>
      )}
      <label>
        Contribution
        <select name="contributionType" defaultValue="in_kind">
          <option value="cash">Cash sponsorship</option>
          <option value="in_kind">Products or services</option>
          <option value="hybrid">Cash plus products or services</option>
        </select>
      </label>
      <label>
        Proposed cash value
        <input name="cashAmountDollars" type="number" min={0} max={1000000} step=".01" defaultValue={0} />
        <small>For accepted cash or hybrid offers, secure Stripe payment is opened after the event host accepts the terms.</small>
      </label>
      <label>
        Products, services, placement, or deliverables
        <textarea name="offerDetails" rows={4} maxLength={1200} placeholder="For example: $2,500 plus wardrobe, logo placement, two tagged posts, and event photography usage rights." />
      </label>
      <label>
        Partnership message
        <textarea
          name="message"
          rows={5}
          minLength={20}
          maxLength={2000}
          placeholder={
            direction === "promoter_to_sponsor"
              ? "Describe the audience, opportunity, contribution requested, and sponsor benefits."
              : "Describe the funding, product, venue, media, or hospitality support you can offer."
          }
          required
        />
      </label>
      {message && <p className="form-error">{message}</p>}
      <button className="button" type="submit" disabled={saving}>
        {saving ? "Sending…" : "Send sponsorship request ↗"}
      </button>
    </form>
  );
}
