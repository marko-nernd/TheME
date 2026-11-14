"use client";
import Link from "next/link";
import { type ComponentProps, type ReactNode, useState } from "react";
import HostEventManager from "@/components/host-event-manager";
import HostParticipationRequests, { type RequestRow } from "@/components/host-participation-requests";
import DashboardSubtabs from "@/components/dashboard-subtabs";
import { useConfirmation } from "@/components/use-confirmation";
import ComplimentaryEventPlace from "@/components/complimentary-event-place";
import HostCheckIn from "@/components/host-check-in";
import HostRefundQueue from "@/components/host-refund-queue";
import AttendeeFlightDetails from "@/components/attendee-flight-details";

type Props = ComponentProps<typeof HostEventManager> & { requests: RequestRow[]; initialEventId?: string; sponsorPanels: Record<string, ReactNode> };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export default function HostEventWorkspace({ events, proposals, paidClients, requests, sponsorPanels, initialEventId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(events.find((event) => event.id === initialEventId)?.id ?? null);
  const { ask, confirmationDialog } = useConfirmation();
  async function closeEvent() {
    if (document.querySelector('.host-settings-inline [data-unsaved="true"]') && !await ask({ title: "Return to all events?", message: "There are unsaved event settings. Discard those edits to return to your event list. Your saved event will not be changed." })) return;
    setSelectedId(null);
  }
  const selected = events.find((event) => event.id === selectedId);
  const attendees = selected ? requests.filter((row) => row.eventId === selected.id) : [];
  const payments = selected ? paidClients.filter((row) => row.eventId === selected.id) : [];
  if (!selected) return <section className="host-event-hub"><header className="ux-section-header"><div><span>MANAGE EVENTS</span><h2>Your events</h2><p>Choose an event to manage people, sponsors, payments, and settings.</p></div><Link className="button" href="/host/new">Create event +</Link></header><div className="host-event-cards">{events.map((event) => <button type="button" key={event.id} onClick={() => setSelectedId(event.id)}><span className="event-state">{event.isPublished ? "Published" : "Draft"}</span><strong>{event.title}</strong><small>{new Date(event.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {event.location}</small><b>{requests.filter((row) => row.eventId === event.id && row.status === "confirmed").length} confirmed · Manage / edit event →</b></button>)}</div>{events.length === 0 && <div className="dashboard-empty"><h3>Create your first event.</h3><p>Set the dates, prices, and who can attend. Your event tools will appear here.</p><Link className="button" href="/host/new">Create an event →</Link></div>}{proposals.length > 0 && <details className="host-submission-archive"><summary>Submission history ({proposals.length})</summary><HostEventManager events={[]} proposals={proposals} paidClients={[]} /></details>}</section>;
  return <section className="host-event-hub">{confirmationDialog}<header className="ux-section-header"><div><button className="ux-back-button" type="button" onClick={closeEvent}>← All events</button><h2>{selected.title}</h2><p>{selected.location}</p></div><Link className="button" target="_blank" href={`/events/${selected.slug}`}>View public page ↗</Link></header><DashboardSubtabs key={selected.id} label="Event workspace" defaultActive={initialEventId === selected.id ? "settings" : "overview"} items={[
    { id: "overview", label: "Overview", content: <div className="event-hub-overview"><div className="event-hub-metrics"><article><span>Confirmed participants</span><strong>{attendees.filter((row) => row.status === "confirmed").length}</strong></article><article><span>Awaiting payment</span><strong>{attendees.filter((row) => ["approved", "awaiting_payment"].includes(row.status)).length}</strong></article><article><span>Needs approval</span><strong>{attendees.filter((row) => row.status === "pending").length}</strong></article><article><span>Event proceeds</span><strong>{money(payments.reduce((sum, row) => sum + row.hostNetCents, 0))}</strong></article></div><p>Starts {new Date(selected.startsAt).toLocaleString()} · {selected.isPublished ? "Published and visible" : "Draft — not publicly visible"}</p><p>Use Participants to check bookings. Edit event contains your dates, pricing, accommodation, media, and refund policy.</p></div> },
    { id: "participants", label: "Participants", content: <><ComplimentaryEventPlace eventId={selected.id} /><HostParticipationRequests requests={attendees} /></> },
    { id: "travel", label: "Flights & transfers", content: <AttendeeFlightDetails eventId={selected.id} manager /> },
    { id: "checkin", label: "Check-in", content: <HostCheckIn eventId={selected.id} /> },
    { id: "refunds", label: "Refunds", content: <HostRefundQueue eventId={selected.id} /> },
    { id: "sponsors", label: "Sponsors", content: sponsorPanels[selected.id] ?? <p className="dashboard-empty">No sponsor activity yet.</p> },
    { id: "payments", label: "Payments", content: <section className="event-hub-payments"><h3>Payments for this event</h3><p>Open a payment to see the fee breakdown and confirmation number.</p>{payments.map((payment) => <details key={payment.id}><summary><strong>{payment.payerName ?? "Guest"}</strong><span>{money(payment.grossCents)}</span></summary><dl><div><dt>Paid</dt><dd>{new Date(payment.paidAt).toLocaleString()}</dd></div><div><dt>Event price</dt><dd>{money(Math.max(0, payment.hostNetCents - (payment.accommodationPriceCents ?? 0)))}</dd></div>{Boolean(payment.accommodationPriceCents) && <div><dt>{payment.accommodationType === "villa" ? "Villa" : "Hotel"} stay</dt><dd>{money(payment.accommodationPriceCents ?? 0)}</dd></div>}<div><dt>Service fee</dt><dd>{money(payment.customerFeeCents)}</dd></div><div><dt>Confirmation</dt><dd>{payment.confirmationCode}</dd></div></dl></details>)}{!payments.length && <p className="dashboard-empty">No completed payments yet.</p>}</section> },
    { id: "settings", label: "Edit event", content: <HostEventManager events={[selected]} proposals={[]} paidClients={payments} embedded /> },
  ]} /></section>;
}
