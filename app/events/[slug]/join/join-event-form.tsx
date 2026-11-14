"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { participationDescription, type ParticipationPathInput } from "@/lib/participation";
import EventPaymentElement from "@/app/checkout/event/[id]/payment-element";

export default function JoinEventForm({
  event,
  member,
  path,
  publishableKey,
  checkoutQuotes,
}: {
  event: { id: string; slug: string; title: string; hotelAvailable: boolean; hotelPriceCents: number; hotelModelsAllowed: boolean; hotelPhotographersAllowed: boolean; villaAvailable: boolean; villaPriceCents: number; villaModelPriceCents: number; villaPhotographerPriceCents: number; villaModelSpots: number; villaPhotographerSpots: number; villaModelsAllowed: boolean; villaPhotographersAllowed: boolean };
  member: { name: string; email: string; role: string } | null;
  path: ParticipationPathInput;
  publishableKey: string;
  checkoutQuotes: Record<"none" | "hotel" | "villa", { customerFeeCents: number; totalCents: number }>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [emailAccessSent, setEmailAccessSent] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    status: string;
  } | null>(null);
  const [booking, setBooking] = useState<{ id: string; token?: string; resumed?: boolean; quote: { baseAmountCents: number; customerFeeCents: number; totalCents: number }; stayCents: number } | null>(null);
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(path.priceCents / 100);
  const goesDirectlyToPayment = path.type === "attendee" || Boolean(member && ["model", "photographer"].includes(member.role) && path.type === member.role);
  const roleHotelAvailable = event.hotelAvailable && (path.type === "photographer" ? event.hotelPhotographersAllowed : path.type === "model" ? event.hotelModelsAllowed : false);
  const roleVillaAvailable = event.villaAvailable && (path.type === "photographer" ? event.villaPhotographersAllowed && event.villaPhotographerSpots > 0 : path.type === "model" ? event.villaModelsAllowed && event.villaModelSpots > 0 : false);
  const canAddStay = ["model", "photographer"].includes(path.type) && (roleHotelAvailable || roleVillaAvailable);
  const [accommodationType, setAccommodationType] = useState<"" | "hotel" | "villa">("");
  const stayPriceCents = accommodationType === "hotel" ? event.hotelPriceCents : accommodationType === "villa" ? (path.type === "photographer" ? event.villaPhotographerPriceCents : event.villaModelPriceCents) : 0;
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const quote = booking?.quote ?? checkoutQuotes[accommodationType || "none"];

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(formEvent.currentTarget);
    try {
      const response = await fetch("/api/event-participations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          pathType: path.type,
          applicantName: data.get("applicantName"),
          applicantEmail: data.get("applicantEmail"),
          note: data.get("note"),
          sponsorAmountDollars: data.get("sponsorAmountDollars"),
          accommodationType,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not submit.");
      if (payload.emailAccessSent) { setEmailAccessSent(true); setSaving(false); return; }
      if (payload.participation.status === "awaiting_payment") {
        if (payload.resumed) setAccommodationType(payload.accommodationType ?? "");
        setBooking({ id: payload.participation.id, token: payload.guestToken, resumed: payload.resumed, quote: payload.quote, stayCents: payload.stayCents ?? 0 });
        setSaving(false);
        return;
      }
      setResult(payload.participation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit.");
      setSaving(false);
    }
  }

  if (emailAccessSent) return <section className="join-event-confirmation" role="status"><h2>Check your email.</h2><p>A booking already exists for this email. Use the private link we sent to securely view or finish your payment.</p><Link className="button" href={`/events/${event.slug}`}>Back to event →</Link></section>;

  if (result) {
    return (
      <section className="join-event-confirmation">
        <p className="eyebrow"><span />Participation saved</p>
        <h2>
          {result.status === "pending"
            ? "The host will review your request."
            : result.status === "confirmed"
              ? "Your place is confirmed."
              : "Your place is ready for payment."}
        </h2>
        <Link className="quiet-dark-link" href={path.type === "attendee" ? `/events/${event.slug}` : "/dashboard"}>
          {path.type === "attendee" ? "View event details →" : "View your dashboard →"}
        </Link>
      </section>
    );
  }

  return (
    <section className="join-event-layout">
      <article>
        <p className="eyebrow"><span />Your booking</p>
        <h2>{path.title}</h2>
        <p>{participationDescription(path)}</p>
        <dl>
          <div><dt>Event price</dt><dd>{booking ? money(booking.quote.baseAmountCents - booking.stayCents) : path.priceCents ? price : "Free"}</dd></div>
          {accommodationType && <div><dt>{accommodationType === "hotel" ? "Hotel stay" : "Villa stay"}</dt><dd>{money(booking?.stayCents ?? stayPriceCents)}</dd></div>}
          <div><dt>Subtotal</dt><dd>{money(booking?.quote.baseAmountCents ?? (path.priceCents + stayPriceCents))}</dd></div>
          <div><dt>Service fee</dt><dd>{money(quote.customerFeeCents)}</dd></div>
          <div className="booking-total"><dt>Total</dt><dd>{money(quote.totalCents)}</dd></div>
        </dl>
        <p className="booking-next-step">{goesDirectlyToPayment ? path.priceCents + stayPriceCents > 0 ? "Next: review the full total, including the service fee, and pay securely. Your place is confirmed after payment." : "This booking is free. Confirm below to reserve your place." : path.approvalRequired ? "The host will review your request before your place is confirmed." : "Confirm below to reserve your place."}</p>
        <Link className="quiet-dark-link" href={`/events/${event.slug}`}>← Back to event details</Link>
      </article>
      <div className="booking-payment-column">
      <form onSubmit={submit}>
        <label>Name<input name="applicantName" defaultValue={member?.name ?? ""} readOnly={Boolean(member)} required minLength={2} autoComplete="name" /></label>
        <label>Email<input name="applicantEmail" type="email" defaultValue={member?.email ?? ""} readOnly={Boolean(member)} required autoComplete="email" /></label>
        {path.type === "sponsor" && (
          <label>
            Proposed sponsorship ($)
            <input
              name="sponsorAmountDollars"
              type="number"
              min={path.priceCents / 100}
              step="1"
              defaultValue={path.priceCents / 100}
              required
            />
          </label>
        )}
        {canAddStay && (
          <fieldset className="join-accommodation-options" disabled={Boolean(booking)}>
            <legend>Optional accommodation</legend>
            <p className="stay-intro">Add a place to stay for your {path.title.toLowerCase()} booking. Accommodation costs extra and is added to your event price. Choose one option below.</p>
            <label className={`stay-option ${!accommodationType ? "is-selected" : ""}`}>
              <input type="radio" name="stayChoice" checked={!accommodationType} onChange={() => setAccommodationType("")} />
              <span><strong>Event only — no accommodation</strong><small>Arrange your own stay. No accommodation charge.</small></span><b>+$0</b>
            </label>
            {roleHotelAvailable && <label className={`stay-option ${accommodationType === "hotel" ? "is-selected" : ""}`}>
              <input type="radio" name="stayChoice" checked={accommodationType === "hotel"} onChange={() => setAccommodationType("hotel")} />
              <span><strong>Add a hotel stay</strong><small>For your {path.title.toLowerCase()} booking · added to this payment.</small></span><b>+{money(event.hotelPriceCents)}</b>
            </label>}
            {roleVillaAvailable && <label className={`stay-option ${accommodationType === "villa" ? "is-selected" : ""}`}>
              <input type="radio" name="stayChoice" checked={accommodationType === "villa"} onChange={() => setAccommodationType("villa")} />
              <span><strong>Add a villa stay</strong><small>For your {path.title.toLowerCase()} booking · {path.type === "photographer" ? event.villaPhotographerSpots : event.villaModelSpots} spaces available.</small></span><b>+{money(path.type === "photographer" ? event.villaPhotographerPriceCents : event.villaModelPriceCents)}</b>
            </label>}
            <p className="stay-selection" role="status">{accommodationType ? `${accommodationType === "hotel" ? "Hotel" : "Villa"} selected: ${money(stayPriceCents)} added for accommodation.` : "Event only selected. No accommodation charge."} Total including service fee: <strong>{money(quote.totalCents)}</strong></p>
            <small>Confirm dates, room arrangements, and what’s included with the host before paying.</small>
          </fieldset>
        )}
        {!booking && <details className="booking-message"><summary>Add an optional message to the host</summary><label>
          Optional message
          <textarea
            name="note"
            rows={3}
            maxLength={1500}
            placeholder={path.type === "sponsor" ? "Add funding, product, or venue details if useful." : "Add any context you want the host to know."}
          />
          <small>Optional · up to 1,500 characters</small>
        </label></details>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!booking && <button className="button" type="submit" disabled={saving}>{saving ? "Preparing secure payment…" : path.priceCents + stayPriceCents > 0 || path.type === "sponsor" ? "Continue to payment below →" : "Confirm my free place →"}</button>}
      </form>
      {booking && <section className="inline-booking-payment" aria-label="Secure payment"><h2>Payment details</h2>{booking.resumed && <p role="status">Your existing unpaid booking has been restored with its saved accommodation choice.</p>}<EventPaymentElement participationId={booking.id} guestToken={booking.token} publishableKey={publishableKey} successHref={booking.token ? `/events/${event.slug}?payment=success` : "/dashboard#events"} /></section>}
      </div>
    </section>
  );
}
