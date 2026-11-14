"use client";
import { shootTypeOptions } from "@/lib/shoot-types";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import {
  CheckboxList,
  CheckboxListItem,
} from "@astryxdesign/core/CheckboxList";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { eventTypeOptions } from "@/lib/event-types";
import LocationAutocomplete, {
  type LocationSelection,
} from "@/components/location-autocomplete";
import ParticipationPathEditor from "@/components/participation-path-editor";
import OrderedEventListEditor from "@/components/ordered-event-list-editor";
import { includedTemplate, accommodationTemplate } from "@/lib/event-list-templates";
import EventTravelEditor from "@/components/event-travel-editor";
import type { EventTravelDetails } from "@/lib/event-travel-fields";
import EventMediaPicker, { type PreparedEventMedia } from "@/components/event-media-picker";
import { useFormDraft } from "@/components/use-form-draft";
import { useConfirmation } from "@/components/use-confirmation";
import {
  defaultParticipationPaths,
  type ParticipationPathInput,
} from "@/lib/participation";

type FormState = {
  role: string;
  contactName: string;
  contactEmail: string;
  organization: string;
  title: string;
  eventType: string;
  location: string;
  countryCode: string;
  stateCode: string;
  city: string;
  locationValid: boolean;
  startDate: string;
  endDate: string;
  venueStatus: string;
  externalEventUrl: string;
  redirectToExternal: boolean;
  fundingSource: string;
  supportNeeded: string[];
  refundDaysBefore: string;
  showRefundNote: boolean;
  flightCostsExcluded: boolean;
  refundTerms: string;
  noRefunds: boolean;
  passportRequired: boolean;
  shootTypes: string[];
  accommodationDetails: string;
  included: string;
  requirements: string;
  hotelAvailable: boolean;
  hotelPriceDollars: string;
  hotelModelsAllowed: boolean;
  hotelPhotographersAllowed: boolean;
  villaAvailable: boolean;
  villaModelPriceDollars: string;
  villaPhotographerPriceDollars: string;
  villaModelSpots: string;
  villaPhotographerSpots: string;
  villaModelsAllowed: boolean;
  villaPhotographersAllowed: boolean;
  airportInfo: string;
  travelDetails: EventTravelDetails;
  flightInstructions: string;
  participationPaths: ParticipationPathInput[];
  introSentence: string;
  fullDescription: string;
  proposalAcknowledged: boolean;
};

const limitedParticipationPaths = defaultParticipationPaths
  .map((path) => path.type === "sponsor" ? { ...path, title: "Sponsorships" } : path);


function initial(account: { role: string; name: string; email: string; organization: string }): FormState {
  return {
  role: account.role,
  contactName: account.name,
  contactEmail: account.email,
  organization: account.organization,
  title: "",
  eventType: "",
  location: "",
  countryCode: "US",
  stateCode: "",
  city: "",
  locationValid: false,
  startDate: "",
  endDate: "",
  venueStatus: "",
  externalEventUrl: "",
  redirectToExternal: false,
  fundingSource: "",
  supportNeeded: [],
  refundDaysBefore: "45",
  showRefundNote: true,
  flightCostsExcluded: true,
  refundTerms: "",
  noRefunds: false,
  passportRequired: false,
  shootTypes: ["Bikini", "Glamour", "Fashion", "Boudoir", "Explicit"],
  accommodationDetails: accommodationTemplate.join("\n"),
  included: includedTemplate.join("\n"),
  requirements: "",
  hotelAvailable: false,
  hotelPriceDollars: "0",
  hotelModelsAllowed: true,
  hotelPhotographersAllowed: false,
  villaAvailable: false,
  villaModelPriceDollars: "0",
  villaPhotographerPriceDollars: "0",
  villaModelSpots: "0",
  villaPhotographerSpots: "0",
  villaModelsAllowed: true,
  villaPhotographersAllowed: false,
  airportInfo: "",
  travelDetails: {},
  flightInstructions: "",
  participationPaths: limitedParticipationPaths,
  introSentence: "",
  fullDescription: "",
  proposalAcknowledged: false,
  };
}

const stepDetails = [
  { title: "Event details", description: "Format, location, dates, venue, description and media" },
  { title: "Funding plan", description: "Tell participants how the event will be funded" },
  { title: "Tickets, stays and refunds", description: "Choose who can join, their prices, optional accommodation and refund terms" },
  { title: "Support needed", description: "Choose whether you need help finding models or sponsors" },
  { title: "Review and confirm", description: "Verify every required field before submitting" },
] as const;

function excludesGeneralAttendee(eventType: string) {
  return ["Photoshoot", "Destination photoshoot", "Video shoot"].includes(eventType);
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

const supportOptions = [
  "Concept development",
  "Venue sourcing",
  "Production crew",
  "Talent curation",
  "Ticketing",
  "Promotion",
  "Sponsors",
  "Travel logistics",
];

export default function EventProposalWizard({
  account,
}: {
  account: { role: string; name: string; email: string; organization: string };
}) {
  const [step, setStep] = useState(1);
  const { ask, confirmationDialog } = useConfirmation();
  const [form, setForm] = useState(() => initial(account));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reference, setReference] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [heroMedia, setHeroMedia] = useState<PreparedEventMedia | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [draftLocation, setDraftLocation] = useState({ countryCode: "US", stateCode: "", city: "" });
  const draft = useFormDraft({ storageKey: `model-escape:event-draft:${account.email}`, value: { step, form: { ...form, proposalAcknowledged: false } }, enabled: !reference, restore: (saved) => {
    if (!saved?.form || typeof saved.form.title !== "string") return;
    setForm({ ...initial(account), ...saved.form, role: account.role, contactName: account.name, contactEmail: account.email, proposalAcknowledged: false });
    setDraftLocation({ countryCode: saved.form.countryCode || "US", stateCode: saved.form.stateCode || "", city: saved.form.city || "" });
    setStep(Math.min(5, Math.max(1, saved.step || 1))); setDraftVersion((value) => value + 1);
  } });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const dateOrderError = Boolean(form.startDate && form.endDate && form.endDate < form.startDate);
  const missingByStep: Record<number, string[]> = {
    1: [
      !form.title.trim() && "Working title",
      !form.eventType && "Event type",
      form.shootTypes.length === 0 && "At least one shoot type",
      !form.locationValid && "Exact city or destination from the location suggestions",
      !form.startDate && "Start date",
      !form.endDate && "End date",
      dateOrderError && "An end date on or after the start date",
      !form.venueStatus && "Venue status",
      form.redirectToExternal && !/^https?:\/\//i.test(form.externalEventUrl) && "A complete http(s) external event URL",
      (!form.introSentence.trim() || wordCount(form.introSentence) > 8) && "Intro sentence containing no more than 8 words",
      form.fullDescription.trim().length < 80 && `Full description (${Math.max(0, 80 - form.fullDescription.trim().length)} more characters)`,
    ].filter(Boolean) as string[],
    2: [!form.fundingSource && "Primary funding source"].filter(Boolean) as string[],
    3: [
      (!form.noRefunds && (!Number.isInteger(Number(form.refundDaysBefore)) || Number(form.refundDaysBefore) < 0 || Number(form.refundDaysBefore) > 365)) && "Refund cutoff between 0 and 365 days, or select No refunds",
      !form.participationPaths.some((path) => path.enabled) && "At least one enabled participation path",
      form.hotelAvailable && Number(form.hotelPriceDollars) <= 0 && "Hotel additional charge",
      form.hotelAvailable && !form.hotelModelsAllowed && !form.hotelPhotographersAllowed && "At least one role eligible for the hotel",
      form.villaAvailable && form.villaModelsAllowed && (Number(form.villaModelSpots) < 1 || Number(form.villaModelPriceDollars) <= 0) && "Villa fee and spaces for models",
      form.villaAvailable && form.villaPhotographersAllowed && (Number(form.villaPhotographerSpots) < 1 || Number(form.villaPhotographerPriceDollars) <= 0) && "Villa fee and spaces for photographers",
      form.villaAvailable && !form.villaModelsAllowed && !form.villaPhotographersAllowed && "At least one role eligible for the villa",
    ].filter(Boolean) as string[],
    4: [],
    5: [
      form.passportRequired && !form.airportInfo.trim() && !form.travelDetails.airportName?.trim() && "Airport information",
      form.passportRequired && !form.flightInstructions.trim() && "Flying instructions",
      !form.proposalAcknowledged && "Proposal acknowledgement",
    ].filter(Boolean) as string[],
  };
  const valid = missingByStep[step].length === 0;
  const allMissing = Object.entries(missingByStep).flatMap(([stepNumber, items]) =>
    items.map((item) => `Step ${stepNumber} — ${stepDetails[Number(stepNumber) - 1].title}: ${item}`),
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/event-proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          timing: `${form.startDate} to ${form.endDate}`,
          refundDaysBefore: Number(form.refundDaysBefore),
          budgetBand: "Not collected",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit the proposal.");
      }
      setReference(data.id);
      draft.clearDraft();
      setPublishedSlug(data.event?.slug ?? "");
      if (heroMedia) {
        const mediaBody = new FormData();
        mediaBody.set("media", heroMedia.media);
        if (heroMedia.poster) mediaBody.set("poster", heroMedia.poster);
        const mediaResponse = await fetch(`/api/event-proposals/${data.id}/media`, {
          method: "POST",
          body: mediaBody,
        });
        const mediaResult = await mediaResponse.json().catch(() => ({}));
        if (!mediaResponse.ok) {
          throw new Error(mediaResult.error ?? "The proposal was saved, but its hero media could not be uploaded.");
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not submit the proposal.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (reference) {
    return (
      <section className="wizard-shell confirmation astryx-wizard-shell">
        <span>✓</span>
        <p className="eyebrow">
          <span /> {publishedSlug ? "Event published" : "Proposal received"}
        </p>
        <h2>{publishedSlug ? "Your event is live." : "Your brief is in the review queue."}</h2>
        <p>
          Reference: <strong>{reference}</strong>
        </p>
        <p>
          {publishedSlug ? "Your event is automatically approved. Share it, invite participants, and manage bookings from your dashboard." : "Your event proposal is ready for administrator review."}
        </p>
        {error && <p className="form-error" role="alert">{error} Your event has been saved; open its Settings to upload the media again.</p>}
        <div>
          <Link className="button" href="/dashboard">
            View local dashboard ↗
          </Link>
          <Link className="quiet-dark-link" href={publishedSlug ? `/events/${publishedSlug}` : "/events"}>
            {publishedSlug ? "View your event →" : "Browse events →"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="wizard-shell astryx-wizard-shell">
      {confirmationDialog}
      <p className="draft-status" role="status">{draft.restored ? "Saved event restored. " : ""}{draft.savedAt ? `Draft saved on this device at ${draft.savedAt}.` : "Your event details save automatically on this device."} Images and videos must be reselected after a reload. <button type="button" onClick={async () => { if (await ask({ title: "Start a new event draft?", message: "This clears the saved draft on this device. Published events and existing bookings will not be affected.", confirmLabel: "Clear draft and start over" })) { draft.clearDraft(); window.location.reload(); } }}>Start over</button></p>
      <div className="wizard-progress astryx-progress">
        <div className="wizard-current-step">
          <span>STEP {step} OF 5</span>
          <strong>{stepDetails[step - 1].title}</strong>
          <small>{stepDetails[step - 1].description}</small>
        </div>
        <ProgressBar
          value={step}
          max={5}
          label={`Event proposal step ${step} of 5`}
          isLabelHidden
        />
      </div>
      <ol className="wizard-step-map" aria-label="Event proposal steps">
        {stepDetails.map((item, index) => (
          <li className={index + 1 === step ? "is-active" : index + 1 < step ? "is-complete" : ""} key={item.title}>
            <span>{index + 1}</span><strong>{item.title}</strong>
          </li>
        ))}
      </ol>

      <form key={draftVersion} onSubmit={submit}>
        <div className="proposal-account-source">
          <span>Submitting as</span>
          <strong>{account.name}</strong>
          <small>{account.role} · {account.email}</small>
        </div>

        {step === 1 && (
          <fieldset>
            <legend>What are you building?</legend>
            <div className="astryx-form-grid">
              <TextInput
                label="Working title"
                value={form.title}
                onChange={(value) => set("title", value)}
                width="100%"
                isRequired
              />
              <Selector
                label="Event type"
                options={eventTypeOptions}
                value={form.eventType}
                onChange={(value) => setForm((current) => ({
                  ...current,
                  eventType: value ?? "",
                  passportRequired: value === "Destination photoshoot" ? current.passportRequired : false,
                  participationPaths: current.participationPaths.map((path) =>
                    path.type === "attendee" && excludesGeneralAttendee(value ?? "")
                      ? { ...path, enabled: false }
                      : path,
                  ),
                }))}
                placeholder="Choose the event format"
                isRequired
              />
              <div className="full shoot-type-builder">
                <span className="date-range-label">Shoot types</span>
                <p>Select every style that may be included. These begin preselected.</p>
                <CheckboxList
                  label="Shoot types"
                  isLabelHidden
                  value={form.shootTypes}
                  onChange={(values) => set("shootTypes", values)}
                >
                  {shootTypeOptions.map((type) => (
                    <CheckboxListItem key={type} value={type} label={type} />
                  ))}
                </CheckboxList>
              </div>
              {form.eventType === "Destination photoshoot" && (
                <label className="dashboard-check full passport-requirement">
                  <input
                    type="checkbox"
                    checked={form.passportRequired}
                    onChange={(event) => set("passportRequired", event.target.checked)}
                  />
                  <span className="passport-icon" aria-hidden="true">🛂</span>
                  <span>Passport is required for this destination shoot</span>
                </label>
              )}
              <LocationAutocomplete
                label="City or destination"
                defaultCountryCode={draftLocation.countryCode}
                defaultStateCode={draftLocation.stateCode}
                defaultCity={draftLocation.city}
                onChange={(selection: LocationSelection) =>
                  setForm((current) => ({
                    ...current,
                    location: selection.location,
                    countryCode: selection.countryCode,
                    stateCode: selection.stateCode,
                    city: selection.city,
                    locationValid: selection.isValid,
                  }))
                }
              />
              <div className="date-range-field">
                <span className="date-range-label">Timing</span>
                <p>Choose the first and last day from the calendar.</p>
                <div className="date-range-inputs">
                  <label>
                    Start date
                    <input
                      required
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={form.startDate}
                      onChange={(event) => {
                        const startDate = event.target.value;
                        setForm((current) => ({
                          ...current,
                          startDate,
                        }));
                      }}
                    />
                  </label>
                  <label>
                    End date
                    <input
                      required
                      type="date"
                      min={
                        form.startDate || new Date().toISOString().slice(0, 10)
                      }
                      value={form.endDate}
                      onChange={(event) => set("endDate", event.target.value)}
                    />
                  </label>
                </div>
                {dateOrderError && <p className="form-error date-order-error" role="alert">Start date must be before or the same day as the end date.</p>}
              </div>
              <div className="full">
                <Selector
                  label="Venue status"
                  options={[
                    "Confirmed",
                    "Option held",
                    "Shortlist exists",
                    "Need venue sourcing",
                  ]}
                  value={form.venueStatus}
                  onChange={(value) => set("venueStatus", value ?? "")}
                  placeholder="Choose the current venue stage"
                  isRequired
                />
              </div>
              <div className="full event-destination-builder">
                <label className="dashboard-check">
                  <input
                    type="checkbox"
                    checked={form.redirectToExternal}
                    onChange={(event) => set("redirectToExternal", event.target.checked)}
                  />
                  Redirect visitors to my event website
                </label>
                <p>Leave this off to use Model Escape checkout. Customers review the service fee with their total before paying.</p>
                {(form.redirectToExternal || form.externalEventUrl) && (
                  <TextInput
                    label="External event website"
                    value={form.externalEventUrl}
                    onChange={(value) => set("externalEventUrl", value)}
                    description="Use the complete https:// address."
                    width="100%"
                    isRequired={form.redirectToExternal}
                  />
                )}
              </div>
              <div className="full">
                <TextInput
                  label="Intro sentence"
                  description="A concise hero introduction. Maximum 8 words."
                  value={form.introSentence}
                  onChange={(value) => {
                    if (wordCount(value) <= 8) set("introSentence", value);
                  }}
                  width="100%"
                  isRequired
                />
                <p className={`character-count ${form.introSentence.trim() && wordCount(form.introSentence) <= 8 ? "is-valid" : ""}`}>
                  {wordCount(form.introSentence)}/8 words
                </p>
              </div>
              <div className="full">
                <TextArea
                  label="Full description"
                  description="Give participants the complete production brief, schedule context, experience, and expected outcome. Minimum 80 characters."
                  value={form.fullDescription}
                  onChange={(value) => set("fullDescription", value)}
                  rows={10}
                  maxLength={5000}
                  isRequired
                />
                <p className={`character-count ${form.fullDescription.length >= 80 ? "is-valid" : ""}`}>
                  {form.fullDescription.length}/5,000 characters
                  {form.fullDescription.length < 80 ? ` · ${80 - form.fullDescription.length} more needed` : " · minimum reached"}
                </p>
              </div>
              <div className="full proposal-optional-details">
                <div>
                  <OrderedEventListEditor label="What’s included" value={form.included} onChange={(value) => set("included", value)} template={includedTemplate} />
                  <OrderedEventListEditor label="Accommodation options" value={form.accommodationDetails} onChange={(value) => set("accommodationDetails", value)} template={accommodationTemplate} />
                </div>

              </div>
              <div className="full">
                <EventMediaPicker onPrepared={setHeroMedia} />
              </div>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend>Can the plan be funded?</legend>
            <p className="field-help">
              Confirm the expected scale and how the production will be funded.
            </p>
            <div className="astryx-form-grid">
              <div className="full">
                <Selector
                  label="Primary funding source"
                  options={[
                    "Self-funded / company budget",
                    "Confirmed sponsor",
                    "Ticket sales with working capital",
                    "Investor or partner capital",
                    "Funding not yet secured",
                  ]}
                  value={form.fundingSource}
                  onChange={(value) => set("fundingSource", value ?? "")}
                  placeholder="Choose the primary source"
                  isRequired
                />
              </div>
            </div>
            <div className="notice-box">
              <strong>Funding readiness</strong>
              <p>
                Funding that is not yet secured can be reviewed, but the event
                will not move into production until capital and an authorized
                decision-maker are confirmed.
              </p>
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset>
            <legend>How can people participate?</legend>
            <p className="field-help">
              Enable only the paths this event needs. General attendee, Model,
              Photographer, and Sponsor are optional individually, but at least
              one participation path must be enabled.
            </p>
            <ParticipationPathEditor
              initialPaths={form.participationPaths}
              onChange={(paths) => set("participationPaths", paths)}
              name=""
            />
            {excludesGeneralAttendee(form.eventType) && (
              <p className="required-path-note">General attendee starts unchecked for {form.eventType.toLowerCase()} events. Enable it only if this production also includes a public-attendee program.</p>
            )}
            <section className="proposal-accommodation-step">
              <div><span>STEP 3B</span><h3>Optional accommodation upgrades</h3><p>Models and photographers can add one paid stay option after choosing their participation path. Leave both unchecked when lodging is not offered.</p></div>
              <div className="proposal-accommodation-options">
                <label className="dashboard-check">
                  <input type="checkbox" checked={form.hotelAvailable} onChange={(event) => set("hotelAvailable", event.target.checked)} />
                  Offer hotel stay
                </label>
                {form.hotelAvailable && <>
                  <label>Additional hotel charge ($)<input type="number" min="1" step=".01" value={form.hotelPriceDollars} onChange={(event) => set("hotelPriceDollars", event.target.value)} /></label>
                  <div className="accommodation-role-checks"><strong>Available to</strong><label className="dashboard-check"><input type="checkbox" checked={form.hotelModelsAllowed} onChange={(event) => set("hotelModelsAllowed", event.target.checked)} /> Models</label><label className="dashboard-check"><input type="checkbox" checked={form.hotelPhotographersAllowed} onChange={(event) => set("hotelPhotographersAllowed", event.target.checked)} /> Photographers</label></div>
                </>}
                <label className="dashboard-check">
                  <input type="checkbox" checked={form.villaAvailable} onChange={(event) => set("villaAvailable", event.target.checked)} />
                  Offer villa stay
                </label>
                {form.villaAvailable && <>
                  <div className="accommodation-role-checks"><strong>Available to</strong><label className="dashboard-check"><input type="checkbox" checked={form.villaModelsAllowed} onChange={(event) => set("villaModelsAllowed", event.target.checked)} /> Models</label><label className="dashboard-check"><input type="checkbox" checked={form.villaPhotographersAllowed} onChange={(event) => set("villaPhotographersAllowed", event.target.checked)} /> Photographers</label></div>
                  <label>Villa charge for models ($)<input type="number" min="0" step=".01" value={form.villaModelPriceDollars} onChange={(event) => set("villaModelPriceDollars", event.target.value)} /></label>
                  <label>Villa charge for photographers ($)<input type="number" min="0" step=".01" value={form.villaPhotographerPriceDollars} onChange={(event) => set("villaPhotographerPriceDollars", event.target.value)} /></label>
                  <label>Villa spaces for models<input type="number" min="0" max="500" step="1" value={form.villaModelSpots} onChange={(event) => set("villaModelSpots", event.target.value)} /></label>
                  <label>Villa spaces for photographers<input type="number" min="0" max="500" step="1" value={form.villaPhotographerSpots} onChange={(event) => set("villaPhotographerSpots", event.target.value)} /></label>
                </>}
              </div>
            </section>
            <div className="refund-builder">
              <div>
                <span>REFUND POLICY</span>
                <h3>Set this event’s cutoff.</h3>
                <p>
                  The default full-refund cutoff is 45 days before the event.
                  You can instead make the event entirely non-refundable.
                </p>
              </div>
              <label>
                Full refund until
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={form.refundDaysBefore}
                  onChange={(event) =>
                    set("refundDaysBefore", event.target.value)
                  }
                  required
                  disabled={form.noRefunds}
                />
                <small>days before the event starts</small>
              </label>
              <label className="dashboard-check full no-refunds-choice">
                <input
                  type="checkbox"
                  checked={form.noRefunds}
                  onChange={(event) => set("noRefunds", event.target.checked)}
                />
                No refunds for this event
              </label>
              <label className="dashboard-check full"><input type="checkbox" checked={form.showRefundNote} onChange={(event) => set("showRefundNote", event.target.checked)} />{form.noRefunds ? "No refunds or credits are offered for this event." : `No refunds or credits are offered within ${form.refundDaysBefore} days of the event date.`}</label>
              <label className="dashboard-check full"><input type="checkbox" checked={form.flightCostsExcluded} onChange={(event) => set("flightCostsExcluded", event.target.checked)} />NOTE: Flight costs are not included.</label>
              <label className="full">
                Additional refund terms <small>Optional</small>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={form.refundTerms}
                  onChange={(event) => set("refundTerms", event.target.value)}
                  placeholder="Add processing details or event-specific exceptions."
                />
              </label>
            </div>
          </fieldset>
        )}

        {step === 4 && (
          <fieldset>
            <legend>Where do you need support?</legend>
            <p className="field-help">
              Select everything you expect Model Escape to help own.
            </p>
            <CheckboxList
              label="Production support"
              isLabelHidden
              value={form.supportNeeded}
              onChange={(values) => set("supportNeeded", values)}
              density="spacious"
              hasDividers
            >
              {supportOptions.map((item) => (
                <CheckboxListItem key={item} value={item} label={item} />
              ))}
            </CheckboxList>
          </fieldset>
        )}

        {step === 5 && (
          <fieldset>
            {(
              <section className="proposal-travel-step">
                <div><span>FINAL TRAVEL STEP</span><h2>Flying instructions.</h2><p>Give confirmed travelers the airport and arrival information they need before booking.</p></div>
                <EventTravelEditor value={form.travelDetails} onChange={(value) => set("travelDetails", value)} />
                <label>Additional airport information<textarea rows={3} maxLength={1200} value={form.airportInfo} onChange={(event) => set("airportInfo", event.target.value)} placeholder="Optional airport notes." /></label>
                <label>Flying instructions<textarea rows={5} maxLength={1800} value={form.flightInstructions} onChange={(event) => set("flightInstructions", event.target.value)} placeholder="Booking deadline, baggage guidance, and any additional instructions." required={form.passportRequired} /></label>
              </section>
            )}
            <legend>Review the brief.</legend>
            <div className="review-grid">
              <div>
                <span>Lead</span>
                <strong>{form.contactName}</strong>
                <p>
                  {form.role} · {form.contactEmail}
                </p>
              </div>
              <div>
                <span>Concept</span>
                <strong>{form.title}</strong>
                <p>
                  {form.eventType} · {form.location} · {form.startDate} to{" "}
                  {form.endDate}
                </p>
              </div>
              <div>
                <span>Intro sentence</span>
                <strong>{form.introSentence || "Not entered"}</strong>
                <p>{wordCount(form.introSentence)}/8 words</p>
              </div>
              <div>
                <span>Hero media</span>
                <strong>{heroMedia ? (heroMedia.kind === "video" ? "Looping MP4" : "1920×1080 image") : "Default event image"}</strong>
                <p>{heroMedia?.kind === "video" ? "Poster frame generated and ready." : "You can update it later from your dashboard."}</p>
              </div>
              <div>
                <span>Shoot types</span>
                <strong>{form.shootTypes.join(", ")}</strong>
                <p>{form.passportRequired ? "Passport required" : "No passport requirement"}</p>
              </div>
              <div>
                <span>Participation</span>
                <strong>
                  {form.participationPaths.filter((path) => path.enabled).length} paths
                </strong>
                <p>
                  {form.participationPaths
                    .filter((path) => path.enabled)
                    .map((path) => path.title)
                    .join(", ")}
                </p>
              </div>
              <div className="review-cost-capacity">
                <span>Cost and available spots</span>
                <strong>Calculated by participation path</strong>
                <ul>{form.participationPaths.filter((path) => path.enabled).map((path) => (
                  <li key={`review-${path.type}`}><b>{path.title}</b><span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(path.priceCents / 100)} each · {path.capacity} spots</span></li>
                ))}</ul>
                <p>Total attendees: {form.participationPaths.filter((path) => path.enabled && ["model", "photographer", "attendee"].includes(path.type)).reduce((total, path) => total + path.capacity, 0)} · Model and photographer spots: {form.participationPaths.filter((path) => path.enabled && ["model", "photographer"].includes(path.type)).reduce((total, path) => total + path.capacity, 0)}</p>
              </div>
              <div>
                <span>Accommodation upgrades</span>
                <strong>{form.hotelAvailable || form.villaAvailable ? "Optional paid stays" : "Not offered"}</strong>
                <p>{[
                  form.hotelAvailable && `Hotel +${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(form.hotelPriceDollars || 0))} · ${[form.hotelModelsAllowed && "models", form.hotelPhotographersAllowed && "photographers"].filter(Boolean).join(" and ")}`,
                  form.villaAvailable && `Villa · ${form.villaModelsAllowed ? `models +${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(form.villaModelPriceDollars || 0))} (${form.villaModelSpots || 0} spaces)` : ""}${form.villaModelsAllowed && form.villaPhotographersAllowed ? " · " : ""}${form.villaPhotographersAllowed ? `photographers +${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(form.villaPhotographerPriceDollars || 0))} (${form.villaPhotographerSpots || 0} spaces)` : ""}`,
                ].filter(Boolean).join(" · ") || "No lodging add-on"}</p>
              </div>
              <div>
                <span>Event destination</span>
                <strong>{form.redirectToExternal ? "External event website" : "Model Escape checkout"}</strong>
                <p>{form.externalEventUrl || "Customer-paid booking and processing fee"}</p>
              </div>
              <div>
                <span>Refund policy</span>
                <strong>{form.noRefunds ? "No refunds" : `${form.refundDaysBefore} days before start`}</strong>
                <p>{form.refundTerms || (form.noRefunds ? "Payments are non-refundable." : "Standard full-refund cutoff applies.")}</p>
              </div>
              <div>
                <span>Support</span>
                <strong>
                  {form.supportNeeded.length
                    ? `${form.supportNeeded.length} areas`
                    : "Independent production"}
                </strong>
                <p>
                  {form.supportNeeded.join(", ") || "No support selected"}
                </p>
              </div>
              <div>
                <span>What’s included</span>
                <strong>{form.included.trim() ? `${form.included.split("\n").filter((item) => item.trim()).length} items` : "Not specified"}</strong>
                <p>{form.included.split("\n").filter((item) => item.trim()).join(", ") || "Optional"}</p>
              </div>
              
            </div>
            <label className="consent">
              <input required type="checkbox" checked={form.proposalAcknowledged} onChange={(event) => set("proposalAcknowledged", event.target.checked)} />I confirm the event details, prices, and refund policy are correct and ready to publish.
            </label>
            <div className={`proposal-completion-check ${allMissing.length ? "has-missing" : "is-complete"}`}>
              <strong>{allMissing.length ? "Complete these fields before submitting:" : "All required fields are complete."}</strong>
              {allMissing.length > 0 && <ul>{allMissing.map((item) => <li key={item}>{item}</li>)}</ul>}
            </div>
            {error && <p className="form-error">{error}</p>}
          </fieldset>
        )}

        <div className="wizard-actions astryx-wizard-actions">
          {step > 1 ? (
            <Button
              label="Back"
              variant="ghost"
              onClick={() => setStep((value) => value - 1)}
            />
          ) : (
            <Link className="quiet-button" href="/host">
              ← Process overview
            </Link>
          )}
          {step < 5 ? (
            <div className="wizard-next-action">
              {!valid && <div className="wizard-missing-fields"><strong>Complete before continuing:</strong><ul>{missingByStep[step].map((item) => <li key={item}>Step {step} — {stepDetails[step - 1].title}: {item}</li>)}</ul></div>}
              <Button
              label={`Next: ${stepDetails[step].title}`}
                variant="primary"
                isDisabled={!valid}
                onClick={() => setStep((value) => value + 1)}
              />
            </div>
          ) : (
            <Button
              label={account.role === "host" ? "Publish event" : "Submit proposal"}
              variant="primary"
              type="submit"
              isLoading={saving}
              isDisabled={!valid}
            />
          )}
        </div>
      </form>
    </section>
  );
}
