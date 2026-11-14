"use client";
import { shootTypeOptions } from "@/lib/shoot-types";

import Link from "next/link";
import AccommodationOptionsEditor from "@/components/accommodation-options-editor";
import OrderedEventListEditor from "@/components/ordered-event-list-editor";
import { includedTemplate, accommodationTemplate } from "@/lib/event-list-templates";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DeleteEventButton from "@/components/delete-event-button";
import { EventMediaManager } from "@/components/event-media-picker";
import LocationAutocomplete from "@/components/location-autocomplete";
import ParticipationPathEditor from "@/components/participation-path-editor";
import { eventTypeOptions } from "@/lib/event-types";
import type { ParticipationPathInput } from "@/lib/participation";
import { useConfirmation } from "@/components/use-confirmation";
import EventTravelEditor from "@/components/event-travel-editor";
import { travelFromForm, type EventTravelDetails } from "@/lib/event-travel-fields";

type ManagedEvent = {
  id: string;
  slug: string;
  title: string;
  category: string;
  location: string;
  countryCode: string | null;
  stateCode: string | null;
  city: string | null;
  summary: string;
  description: string;
  imagePath: string;
  mediaType: string;
  hasMedia: boolean;
  hasPoster: boolean;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  externalEventUrl: string | null;
  redirectToExternal: boolean;
  priceCents: number;
  refundDaysBefore: number;
  showRefundNote: boolean;
  flightCostsExcluded: boolean;
  refundTerms: string;
  noRefunds: boolean;
  passportRequired: boolean;
  travelDetails?: EventTravelDetails;
  airportInfo?: string;
  flightInstructions?: string;
  shootTypes: string[];
  participationPaths: ParticipationPathInput[];
  accommodationDetails: string[];
  accommodationLinks: string[];
  included: string[];
  requirements: string[];
  hotelAvailable: boolean;
  hotelPriceCents: number;
  hotelModelsAllowed: boolean;
  hotelPhotographersAllowed: boolean;
  villaAvailable: boolean;
  villaModelPriceCents: number;
  villaPhotographerPriceCents: number;
  villaModelSpots: number;
  villaPhotographerSpots: number;
  villaModelsAllowed: boolean;
  villaPhotographersAllowed: boolean;
  capacity: number;
  spotsRemaining: number;
  isPublished: boolean;
  updatedAt: string;
};

type EventProposalStatus = {
  id: string;
  title: string;
  eventType: string;
  location: string;
  timing: string;
  status: "submitted" | "reviewing" | "approved" | "declined" | "rejected" | "deleted";
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
};

type PaidClient = {
  id: string;
  eventId: string;
  payerName: string | null;
  pathType: string | null;
  accommodationType: string | null;
  accommodationPriceCents: number | null;
  grossCents: number;
  customerFeeCents: number;
  hostNetCents: number;
  confirmationCode: string;
  stripePaymentIntentId: string | null;
  paidAt: string;
};

const proposalStatus = {
  submitted: { label: "Pending review", className: "is-pending", detail: "Submitted to the Model Escape admin queue." },
  reviewing: { label: "Under review", className: "is-reviewing", detail: "An administrator is reviewing the proposal." },
  approved: { label: "Approved", className: "is-approved", detail: "Approved and converted into an event." },
  declined: { label: "Declined", className: "is-declined", detail: "Not approved for publication." },
  rejected: { label: "Rejected", className: "is-declined", detail: "The administrator did not approve this proposal." },
  deleted: { label: "Approved / Deleted", className: "is-declined", detail: "This proposal was approved, then its event was deleted by its owner or an administrator." },
} as const;

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function HostEventManager({ events, proposals, paidClients, embedded = false }: { events: ManagedEvent[]; proposals: EventProposalStatus[]; paidClients: PaidClient[]; embedded?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ManagedEvent | null>(embedded ? events[0] ?? null : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { ask, confirmationDialog } = useConfirmation();
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function closeEditor() {
    if (dirty && !await ask({ title: "Discard event edits?", message: "Your saved event will stay unchanged. Only the unsaved edits in this form will be discarded." })) return;
    setDirty(false); setSelected(null);
  }
  const [proposalTab, setProposalTab] = useState<"approved" | "pending" | "deleted">("pending");
  const visibleProposals = proposals.filter((proposal) =>
    proposalTab === "approved" ? proposal.status === "approved" :
    proposalTab === "pending" ? ["submitted", "reviewing"].includes(proposal.status) :
    ["deleted", "declined", "rejected"].includes(proposal.status),
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
    const response = await fetch(`/api/host/events/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        category: form.get("category"),
        countryCode: form.get("countryCode"),
        stateCode: form.get("stateCode"),
        city: form.get("city"),
        location: form.get("location"),
        venue: form.get("venue"),
        startsAt: form.get("startsAt"),
        endsAt: form.get("endsAt"),
        costDollars: Number(form.get("costDollars")),
        capacity: Number(form.get("capacity")),
        spotsRemaining: Number(form.get("spotsRemaining")),
        refundDaysBefore: Number(form.get("refundDaysBefore")),
        showRefundNote: form.get("showRefundNote") === "on",
        flightCostsExcluded: form.get("flightCostsExcluded") === "on",
        refundTerms: form.get("refundTerms"),
        noRefunds: form.get("noRefunds") === "on",
        passportRequired: form.get("passportRequired") === "on",
        travelDetails: travelFromForm(form),
        airportInfo: form.get("airportInfo"),
        flightInstructions: form.get("flightInstructions"),
        shootTypes: form.getAll("shootTypes"),
        externalEventUrl: form.get("externalEventUrl"),
        redirectToExternal: form.get("redirectToExternal") === "on",
        summary: form.get("summary"),
        description: form.get("description"),
        accommodationOptions: JSON.parse(String(form.get("accommodationOptions") ?? "[]")),
        included: String(form.get("included") ?? "").split("\n"),
        hotelAvailable: form.get("hotelAvailable") === "on",
        hotelPriceDollars: Number(form.get("hotelPriceDollars")),
        hotelModelsAllowed: form.get("hotelModelsAllowed") === "on",
        hotelPhotographersAllowed: form.get("hotelPhotographersAllowed") === "on",
        villaAvailable: form.get("villaAvailable") === "on",
        villaModelPriceDollars: Number(form.get("villaModelPriceDollars")),
        villaPhotographerPriceDollars: Number(form.get("villaPhotographerPriceDollars")),
        villaModelSpots: Number(form.get("villaModelSpots")),
        villaPhotographerSpots: Number(form.get("villaPhotographerSpots")),
        villaModelsAllowed: form.get("villaModelsAllowed") === "on",
        villaPhotographersAllowed: form.get("villaPhotographersAllowed") === "on",
        participationPaths: JSON.parse(String(form.get("participationPaths") ?? "[]")),
        imagePath: selected.imagePath,
        isPublished: form.get("isPublished") === "on",
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Could not save event settings.");
      return;
    }
    setSelected(null);
    setDirty(false);
    setNotice(`${selected.title} settings saved.`);
    router.refresh();
    } catch { setError("Connection lost. Your edits are still here. Try saving again."); setSaving(false); }
  }

  return (
    <section className="host-event-manager">
      {confirmationDialog}
      <div hidden={embedded}>
      <header className="host-event-manager-heading">
        <div>
          <p className="eyebrow"><span />Event management</p>
          <h2>Your events.</h2>
          <p>Only events owned by your account appear here. Edit settings, media, availability, participation paths, and publishing status.</p>
        </div>
        <Link className="button" href="/host/new">Create event +</Link>
      </header>

      {notice && <div className="host-event-save-notice" role="status">{notice}</div>}
      <section className="host-event-status-section">
        <div className="host-event-status-heading">
          <div><span>SUBMITTED EVENTS</span><h3>Proposal status</h3></div>
          <small>{proposals.length} submission{proposals.length === 1 ? "" : "s"}</small>
        </div>
        <nav className="admin-subtabs" aria-label="Submitted event statuses">
          {(["approved", "pending", "deleted"] as const).map((tab) => <button key={tab} type="button" className={proposalTab === tab ? "is-active" : ""} onClick={() => setProposalTab(tab)}>{tab === "pending" ? "Pending Review" : tab}</button>)}
        </nav>
        {visibleProposals.length ? (
          <div className="host-event-proposal-list">
            {visibleProposals.map((proposal) => {
              const status = proposalStatus[proposal.status];
              return (
                <article key={proposal.id}>
                  <span className={`event-state ${status.className}`}>{status.label}</span>
                  <div>
                    <strong>{proposal.title}</strong>
                    <p>{proposal.eventType} · {proposal.location}</p>
                    <small>{proposal.timing} · {status.detail} Last updated {date.format(new Date(proposal.updatedAt))}.</small>
                    {["declined", "rejected"].includes(proposal.status) && proposal.rejectionReason && <p className="proposal-rejection-reason"><strong>Reason:</strong> {proposal.rejectionReason}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className="dashboard-empty">No event proposals have been submitted from this account.</p>}
      </section>

      <div className="host-event-status-heading approved-events-heading">
        <div><span>APPROVED EVENTS</span><h3>Manage published and draft events</h3></div>
        <small>{events.length} event{events.length === 1 ? "" : "s"}</small>
      </div>
      {events.length ? (
        <div className="host-event-management-list">
          {events.map((event) => (
            <article key={event.id}>
              <div className="host-event-management-main">
                <span className={event.isPublished ? "event-state is-live" : "event-state"}>{event.isPublished ? "Published" : "Draft"}</span>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.category} · {event.location}</p>
                  <small>{date.format(new Date(event.startsAt))} · {event.spotsRemaining} of {event.capacity} spots available</small>
                </div>
              </div>
              <div className="host-event-management-actions">
                <Link href={`/events/${event.slug}`} target="_blank">View ↗</Link>
                <button type="button" onClick={() => { setError(""); setSelected(event); }}>Edit event</button>
                <DeleteEventButton eventId={event.id} eventTitle={event.title} endpoint="host" />
              </div>
              <details className="host-paid-client-window">
                <summary><span>PAID CLIENTELE</span><strong>{paidClients.filter((client) => client.eventId === event.id).length} confirmed payment{paidClients.filter((client) => client.eventId === event.id).length === 1 ? "" : "s"}</strong><b aria-hidden="true">⌄</b></summary>
                <div className="host-paid-client-list">
                  {paidClients.filter((client) => client.eventId === event.id).length ? paidClients.filter((client) => client.eventId === event.id).map((client) => {
                    const accommodation = client.accommodationPriceCents ?? 0;
                    return <details key={client.id}>
                      <summary><div><strong>{client.payerName ?? "Guest"}</strong><small>{client.pathType === "attendee" ? "Guest" : client.pathType ?? "Participant"} · Paid {dateTime.format(new Date(client.paidAt))}</small></div><span>{client.confirmationCode}</span><b aria-hidden="true">+</b></summary>
                      <div className="host-paid-client-detail">
                        <dl>
                          <div><dt>Payment date</dt><dd>{dateTime.format(new Date(client.paidAt))}</dd></div>
                          <div><dt>Event fee</dt><dd>{money.format(Math.max(0, client.hostNetCents - accommodation) / 100)}</dd></div>
                          {accommodation > 0 && <div><dt>{client.accommodationType === "villa" ? "Villa" : "Hotel"}</dt><dd>{money.format(accommodation / 100)}</dd></div>}
                          <div><dt>Service fee</dt><dd>{money.format(client.customerFeeCents / 100)}</dd></div>
                          <div><dt>Total paid</dt><dd>{money.format(client.grossCents / 100)}</dd></div>
                          <div><dt>Confirmation number</dt><dd className="host-confirmation-code">{client.confirmationCode}</dd></div>
                        </dl>
                        <small>Transaction ID: {client.id}</small>
                        {client.stripePaymentIntentId && <small>Stripe reference: {client.stripePaymentIntentId}</small>}
                      </div>
                    </details>;
                  }) : <p>No completed payments for this event yet.</p>}
                </div>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="dashboard-empty">
          <strong>No events yet.</strong>
          <p>Create your first event to manage its dates, pricing, participants, and publishing settings here.</p>
          <Link className="quiet-dark-link" href="/host/new">Create an event →</Link>
        </div>
      )}

      </div>
      {embedded && notice && <p className="draft-status" role="status">{notice} <button type="button" onClick={() => setSelected(events[0] ?? null)}>Edit again</button></p>}
      {embedded && !selected && !notice && <button className="button" type="button" onClick={() => setSelected(events[0] ?? null)}>Edit event settings →</button>}
      {selected && (
        <div className={embedded ? "host-settings-inline" : "admin-editor-backdrop host-event-editor-backdrop"} role="presentation" onMouseDown={(event) => {
          if (!embedded && event.target === event.currentTarget) closeEditor();
        }}>
          <section className="admin-editor host-event-editor" role={embedded ? "region" : "dialog"} aria-modal={embedded ? undefined : true} aria-labelledby="host-event-editor-title">
            <header>
              <div><p className="eyebrow"><span />Edit owned event</p><h2 id="host-event-editor-title">{selected.title}</h2></div>
              <button type="button" onClick={closeEditor} aria-label="Close event editor">×</button>
            </header>
            <form className="admin-editor-form" onSubmit={save} onChange={() => setDirty(true)} data-unsaved={dirty ? "true" : "false"}>
              <label>Event title<input name="title" defaultValue={selected.title} required /></label>
              <label>Event type<select name="category" defaultValue={selected.category}>{eventTypeOptions.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
              <div className="full">
                <LocationAutocomplete
                  key={selected.id}
                  name="location"
                  label="Event location"
                  defaultCountryCode={selected.countryCode ?? "US"}
                  defaultStateCode={selected.stateCode ?? ""}
                  defaultCity={selected.city ?? ""}
                />
              </div>
              <label>Venue<input name="venue" defaultValue={selected.venue ?? ""} /></label>
              <label>Starts<input name="startsAt" type="datetime-local" defaultValue={localDateTime(selected.startsAt)} required /></label>
              <label>Ends<input name="endsAt" type="datetime-local" defaultValue={localDateTime(selected.endsAt)} /></label>
              <label>Cost ($)<input name="costDollars" type="number" min="0" step=".01" defaultValue={selected.priceCents / 100} required /></label>
              <label>Total spots<input name="capacity" type="number" min="1" defaultValue={selected.capacity} required /></label>
              <label>Spots available<input name="spotsRemaining" type="number" min="0" defaultValue={selected.spotsRemaining} required /></label>
              <label>Refund cutoff (days)<input name="refundDaysBefore" type="number" min="0" max="365" defaultValue={selected.refundDaysBefore} required /></label>
              <label className="admin-checkbox"><input name="noRefunds" type="checkbox" defaultChecked={selected.noRefunds} /> No refunds for this event</label>
              <label className="admin-checkbox"><input name="passportRequired" type="checkbox" defaultChecked={selected.passportRequired} /> Passport required</label>
              <fieldset className="full travel-editor-section"><legend>Flying instructions</legend><p>Changes notify paid, confirmed attendees. All times below use the destination timezone.</p><EventTravelEditor initial={selected.travelDetails} /><label>Additional airport information<textarea name="airportInfo" rows={3} maxLength={1200} defaultValue={selected.airportInfo ?? ""} /></label><label>Additional flying instructions<textarea name="flightInstructions" rows={4} maxLength={1800} defaultValue={selected.flightInstructions ?? ""} /></label></fieldset>
              <fieldset className="full event-note-options"><legend>Event notes</legend>
                <label className="admin-checkbox"><input name="showRefundNote" type="checkbox" defaultChecked={selected.showRefundNote} /> Show the no-refunds-or-credits note using the refund cutoff above (default: 45 days).</label>
                <label className="admin-checkbox"><input name="flightCostsExcluded" type="checkbox" defaultChecked={selected.flightCostsExcluded} /> NOTE: Flight costs are not included.</label>
              </fieldset>
              <label className="full">Custom refund terms<textarea name="refundTerms" rows={3} maxLength={1000} defaultValue={selected.refundTerms} /></label>
              <label className="full">External event website<input name="externalEventUrl" type="url" placeholder="https://" defaultValue={selected.externalEventUrl ?? ""} /></label>
              <label className="admin-checkbox full"><input name="redirectToExternal" type="checkbox" defaultChecked={selected.redirectToExternal} /> Redirect visitors to the external event website</label>
              <label className="full">Short summary<textarea name="summary" rows={3} defaultValue={selected.summary} required /></label>
              <label className="full">Full description<textarea name="description" rows={6} defaultValue={selected.description} /></label>
              <OrderedEventListEditor label="What’s included" name="included" initial={selected.included} template={includedTemplate} onChange={() => setDirty(true)} />
              <AccommodationOptionsEditor details={selected.accommodationDetails} links={selected.accommodationLinks} template={accommodationTemplate} onChange={() => setDirty(true)} />
              {selected.category === "Destination photoshoot" && <fieldset className="host-accommodation-editor full">
                <legend>Hotel and villa accommodations</legend>
                <p>Set optional lodging charges and choose which creative roles can add each charge to their event payment. Models are enabled by default.</p>
                <section>
                  <div>
                    <label className="admin-checkbox"><input name="hotelAvailable" type="checkbox" defaultChecked={selected.hotelAvailable} /> Offer hotel accommodation</label>
                    <label>Hotel fee per person ($)<input name="hotelPriceDollars" type="number" min="0" step=".01" defaultValue={selected.hotelPriceCents / 100} /></label>
                  </div>
                  <div className="host-accommodation-role-options">
                    <strong>Who can add the hotel fee?</strong>
                    <label className="admin-checkbox"><input name="hotelModelsAllowed" type="checkbox" defaultChecked={selected.hotelModelsAllowed || !selected.hotelPhotographersAllowed} /> Models</label>
                    <label className="admin-checkbox"><input name="hotelPhotographersAllowed" type="checkbox" defaultChecked={selected.hotelPhotographersAllowed ?? false} /> Photographers</label>
                  </div>
                </section>
                <section>
                  <div>
                    <label className="admin-checkbox"><input name="villaAvailable" type="checkbox" defaultChecked={selected.villaAvailable} /> Offer villa accommodation</label>
                  </div>
                  <div className="host-accommodation-role-options">
                    <strong>Who can add a villa stay?</strong>
                    <label className="admin-checkbox"><input name="villaModelsAllowed" type="checkbox" defaultChecked={selected.villaModelsAllowed || !selected.villaPhotographersAllowed} /> Models</label>
                    <label className="admin-checkbox"><input name="villaPhotographersAllowed" type="checkbox" defaultChecked={selected.villaPhotographersAllowed ?? false} /> Photographers</label>
                  </div>
                  <label>Model villa fee ($)<input name="villaModelPriceDollars" type="number" min="0" step=".01" defaultValue={selected.villaModelPriceCents / 100} /></label>
                  <label>Model villa spaces<input name="villaModelSpots" type="number" min="0" max="500" defaultValue={selected.villaModelSpots} /></label>
                  <label>Photographer villa fee ($)<input name="villaPhotographerPriceDollars" type="number" min="0" step=".01" defaultValue={selected.villaPhotographerPriceCents / 100} /></label>
                  <label>Photographer villa spaces<input name="villaPhotographerSpots" type="number" min="0" max="500" defaultValue={selected.villaPhotographerSpots} /></label>
                </section>
              </fieldset>}
              <fieldset className="host-shoot-type-options full">
                <legend>Shoot types</legend>
                {shootTypeOptions.map((type) => (
                  <label key={type}><input name="shootTypes" type="checkbox" value={type} defaultChecked={selected.shootTypes.includes(type)} /> {type}</label>
                ))}
              </fieldset>
              <div className="full">
                <span className="admin-field-heading">Participation paths</span>
                <ParticipationPathEditor initialPaths={selected.participationPaths} />
              </div>
              <label className="admin-checkbox full"><input name="isPublished" type="checkbox" defaultChecked={selected.isPublished} /> Published publicly</label>
              {error && <p className="form-error full" role="alert">{error}</p>}
              <div className="admin-editor-actions full">
                <button type="button" onClick={closeEditor}>Cancel</button>
                <button className="button" type="submit" disabled={saving}>{saving ? "Saving settings…" : "Save event settings"}</button>
              </div>
            </form>
            <div className="host-event-media-section">
              <span className="admin-field-heading">Event hero media</span>
              <EventMediaManager
                eventId={selected.id}
                currentMedia={selected.hasMedia ? `/api/events/${selected.id}/media` : selected.imagePath}
                currentPoster={selected.hasPoster ? `/api/events/${selected.id}/media?poster=1` : selected.imagePath}
                currentType={selected.hasMedia && selected.mediaType === "video" ? "video" : "image"}
              />
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
