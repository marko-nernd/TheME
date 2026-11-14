"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import HostRequestActions from "@/components/host-request-actions";
import { memberPlaceholder } from "@/lib/member-placeholder";

export type RequestRow = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStartsAt: string;
  eventLocation: string;
  pathType: string;
  status: string;
  applicantName: string;
  applicantEmail: string;
  applicantMemberId: string;
  applicantProfileSlug: string | null;
  applicantImagePath: string | null;
  applicantAvatarVersion: number | null;
  note: string;
  withdrawalReason: string | null;
  priceCents: number;
  accommodationType: string | null;
  accommodationPriceCents: number;
  confirmationEmailSentAt: string | null;
  transactionId: string | null;
  stripePaymentIntentId: string | null;
  confirmationCode: string | null;
  transactionStatus: string | null;
  grossCents: number | null;
  customerFeeCents: number | null;
  hostNetCents: number | null;
  currency: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatMoney(cents: number | null, currencyCode = "usd") {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(cents / 100);
}

function readableStatus(status: string) {
  if (status === "awaiting_payment" || status === "approved") return "Payment pending";
  return status.replaceAll("_", " ");
}

function RequestCard({ request }: { request: RequestRow }) {
  const currency = request.currency ?? "usd";
  const accommodationCents = request.accommodationPriceCents ?? 0;
  const eventPriceCents = Math.max(0, (request.hostNetCents ?? request.priceCents) - accommodationCents);
  const isPaid = request.transactionStatus === "paid" && Boolean(request.paidAt);

  return (
    <article className="host-request-row">
      <details className="host-participant-record">
        <summary>
          <div className="host-request-applicant">
            <div className="host-request-avatar">
              {request.applicantAvatarVersion ? (
                <Image
                  unoptimized
                  src={`/api/members/${request.applicantMemberId}/avatar?v=${request.applicantAvatarVersion}`}
                  alt={`${request.applicantName} profile`}
                  width={56}
                  height={56}
                />
              ) : <Image unoptimized src={memberPlaceholder(request.pathType)} alt={`${request.pathType} placeholder`} width={56} height={56} />}
            </div>
            <div>
              <span>{request.pathType}</span>
              <strong>{request.applicantName}</strong>
              <small>{request.applicantEmail}</small>
            </div>
          </div>
          <div className="host-participant-summary-state">
            <span className={`host-participant-status status-${request.status}`}>{readableStatus(request.status)}</span>
            <b aria-hidden="true">View details +</b>
          </div>
        </summary>

        <div className="host-participant-detail">
          <header>
            <div>
              <span>PARTICIPANT RECORD</span>
              <h4>{request.applicantName}</h4>
            </div>
            {request.applicantProfileSlug && <Link href={`/members/${request.applicantProfileSlug}`} target="_blank">Open profile ↗</Link>}
          </header>

          <dl className="host-participant-timeline">
            <div><dt>Participation</dt><dd>{request.pathType === "attendee" ? "Guest" : request.pathType}</dd></div>
            <div><dt>Current status</dt><dd>{readableStatus(request.status)}</dd></div>
            <div><dt>Request received</dt><dd>{dateTime.format(new Date(request.createdAt))}</dd></div>
            <div><dt>Last status update</dt><dd>{dateTime.format(new Date(request.updatedAt))}</dd></div>
            <div><dt>Payment</dt><dd>{isPaid ? "Paid and confirmed" : request.priceCents > 0 ? "Not paid" : "Complimentary"}</dd></div>
            <div><dt>Confirmation email</dt><dd>{request.confirmationEmailSentAt ? `Sent ${dateTime.format(new Date(request.confirmationEmailSentAt))}` : "Not sent"}</dd></div>
          </dl>

          {isPaid ? (
            <section className="host-participant-payment" aria-label="Payment breakdown">
              <div className="host-participant-payment-heading">
                <div><span>PAYMENT DETAILS</span><strong>{formatMoney(request.grossCents, currency)} paid</strong></div>
                <span className="payment-status-paid">{request.transactionStatus}</span>
              </div>
              <dl>
                <div><dt>Event fee</dt><dd>{formatMoney(eventPriceCents, currency)}</dd></div>
                {accommodationCents > 0 && <div><dt>{request.accommodationType === "villa" ? "Villa" : "Hotel"} accommodation</dt><dd>{formatMoney(accommodationCents, currency)}</dd></div>}
                <div><dt>Host proceeds</dt><dd>{formatMoney(request.hostNetCents, currency)}</dd></div>
                <div><dt>Service fee paid by participant</dt><dd>{formatMoney(request.customerFeeCents, currency)}</dd></div>
                <div className="host-participant-payment-total"><dt>Total charged</dt><dd>{formatMoney(request.grossCents, currency)}</dd></div>
              </dl>
              <div className="host-participant-reference">
                <span><strong>Paid</strong>{dateTime.format(new Date(request.paidAt!))}</span>
                <span><strong>Transaction ID</strong><code>{request.transactionId}</code></span>
                <span><strong>Confirmation</strong><code>{request.confirmationCode ?? "Not available"}</code></span>
                <span><strong>Stripe reference</strong><code>{request.stripePaymentIntentId ?? "Not available"}</code></span>
              </div>
            </section>
          ) : (
            <div className="host-participant-payment-empty">
              <strong>{request.priceCents > 0 ? `${formatMoney(request.priceCents, currency)} awaiting payment` : "No payment is required for this participation."}</strong>
              <p>A transaction reference and payment timestamp will appear here after a successful Stripe payment.</p>
            </div>
          )}

          <div className="host-participant-message">
            <strong>{request.withdrawalReason ? "Withdrawal reason" : "Optional message"}</strong>
            <p>{request.withdrawalReason || request.note || "No optional message was provided."}</p>
          </div>
        </div>
      </details>
      <div>
        <HostRequestActions participationId={request.id} status={request.status} participantName={request.applicantName} />
      </div>
      <small className="host-participant-payment-footer">{isPaid ? `Paid ${dateTime.format(new Date(request.paidAt!))}` : request.priceCents > 0 ? "Payment not completed" : "No payment required"}</small>
    </article>
  );
}

export default function HostParticipationRequests({ requests }: { requests: RequestRow[] }) {
  const [tab, setTab] = useState<"pending" | "payment" | "confirmed" | "withdrawn">("confirmed");
  const withdrawn = requests.filter((request) => ["cancelled", "declined", "refunded"].includes(request.status));
  const active = requests.filter((request) => request.status !== "cancelled" && request.status !== "declined" && request.status !== "refunded");
  const pending = active.filter((request) => request.status === "pending");
  const awaitingPayment = active.filter((request) => ["approved", "awaiting_payment"].includes(request.status));
  const confirmed = active.filter((request) => request.status === "confirmed");
  const visible = tab === "pending" ? pending : tab === "payment" ? awaitingPayment : tab === "confirmed" ? confirmed : withdrawn;
  const eventGroups = Array.from(visible.reduce((groups, request) => {
    const existing = groups.get(request.eventId) ?? {
      id: request.eventId,
      title: request.eventTitle,
      slug: request.eventSlug,
      startsAt: request.eventStartsAt,
      location: request.eventLocation,
      requests: [] as RequestRow[],
    };
    existing.requests.push(request);
    groups.set(request.eventId, existing);
    return groups;
  }, new Map<string, {
    id: string;
    title: string;
    slug: string;
    startsAt: string;
    location: string;
    requests: RequestRow[];
  }>()).values()).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <section className="host-participation-section">
      <div className="host-participation-heading">
        <h3>Participants</h3>
        <div className="participation-tabs" role="tablist" aria-label="Participation request status">
          <button type="button" role="tab" aria-selected={tab === "pending"} onClick={() => setTab("pending")}>
            Needs approval <b>{pending.length}</b>
          </button>
          <button type="button" role="tab" aria-selected={tab === "payment"} onClick={() => setTab("payment")}>Awaiting payment <b>{awaitingPayment.length}</b></button>
          <button type="button" role="tab" aria-selected={tab === "confirmed"} onClick={() => setTab("confirmed")}>
            Confirmed <b>{confirmed.length}</b>
          </button>
          <button type="button" role="tab" aria-selected={tab === "withdrawn"} onClick={() => setTab("withdrawn")}>
            Removed / withdrawn <b>{withdrawn.length}</b>
          </button>
        </div>
      </div>
      <div className="host-participation-event-list">
        {eventGroups.length ? eventGroups.map((event) => (
          <details className="host-participation-event" open key={event.id}>
            <summary>
              <div>
                <span>EVENT</span>
                <Link href={`/events/${event.slug}`}>{event.title} ↗</Link>
                <small>{event.location} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(event.startsAt))}</small>
              </div>
              <div>
                <strong>{event.requests.length}</strong>
                <span>{tab === "pending" ? "need approval" : tab === "payment" ? "awaiting payment" : tab === "confirmed" ? "confirmed" : "removed / withdrawn"}</span>
                <b aria-hidden="true">⌄</b>
              </div>
            </summary>
            <div className="host-request-list">
              {event.requests.map((request) => <RequestCard request={request} key={request.id} />)}
            </div>
          </details>
        )) : (
          <p className="dashboard-empty">
            {tab === "pending" ? "Nobody is waiting for your approval." : tab === "payment" ? "No participants are awaiting payment." : tab === "confirmed" ? "No participants are confirmed yet. Share your event to invite people." : "No participants have been removed or withdrawn."}
          </p>
        )}
      </div>
    </section>
  );
}
