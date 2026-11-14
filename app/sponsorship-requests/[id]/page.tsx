import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { events, members, sponsors, sponsorshipAgreements, sponsorshipRequestMessages, sponsorshipRequests } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getAuthorizedSponsorshipRequest } from "@/lib/sponsorship-access";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import RequestDecisionActions from "@/components/request-decision-actions";
import SponsorshipConversation from "@/components/sponsorship-conversation";

export const dynamic = "force-dynamic";

export default async function SponsorshipRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember(); const { id } = await params; if (!member) redirect(`/login?next=/sponsorship-requests/${id}`);
  const access = await getAuthorizedSponsorshipRequest(id, member.id); if (!access) notFound();
  const [record] = await db.select({ id: sponsorshipRequests.id, requesterMemberId: sponsorshipRequests.requesterMemberId, responseMemberId: sponsorshipRequests.responseMemberId, status: sponsorshipRequests.status, direction: sponsorshipRequests.direction, message: sponsorshipRequests.message, responseNote: sponsorshipRequests.responseNote, contributionType: sponsorshipRequests.contributionType, cashAmountCents: sponsorshipRequests.cashAmountCents, offerDetails: sponsorshipRequests.offerDetails, flightIncluded: sponsorshipRequests.flightIncluded, hotelIncluded: sponsorshipRequests.hotelIncluded, representationRequired: sponsorshipRequests.representationRequired, representationTerms: sponsorshipRequests.representationTerms, createdAt: sponsorshipRequests.createdAt, respondedAt: sponsorshipRequests.respondedAt, eventTitle: events.title, eventSlug: events.slug, sponsorName: sponsors.name, agreementId: sponsorshipAgreements.id, agreementStatus: sponsorshipAgreements.status, paymentStatus: sponsorshipAgreements.paymentStatus, inKindStatus: sponsorshipAgreements.inKindStatus })
    .from(sponsorshipRequests).innerJoin(events, eq(events.id, sponsorshipRequests.eventId)).innerJoin(sponsors, eq(sponsors.id, sponsorshipRequests.sponsorId)).leftJoin(sponsorshipAgreements, eq(sponsorshipAgreements.requestId, sponsorshipRequests.id)).where(eq(sponsorshipRequests.id, id)).limit(1);
  if (!record) notFound();
  const [requester, target, messages] = await Promise.all([
    db.select({ name: members.name }).from(members).where(eq(members.id, record.requesterMemberId)).limit(1),
    access.targetMemberId ? db.select({ name: members.name, role: members.primaryRole }).from(members).where(eq(members.id, access.targetMemberId)).limit(1) : Promise.resolve([]),
    db.select().from(sponsorshipRequestMessages).where(eq(sponsorshipRequestMessages.requestId, id)).orderBy(asc(sponsorshipRequestMessages.createdAt)),
  ]);
  const awaitingMe = ["pending", "countered"].includes(record.status) && (record.responseMemberId ?? record.requesterMemberId) !== member.id;
  const agreementComplete = record.agreementStatus === "confirmed" || record.agreementStatus === "completed";
  const fulfillmentComplete = record.agreementStatus === "completed";
  return <main><SiteHeader inner /><section className="sponsorship-workspace-page">
    <div className="sponsorship-workspace-heading"><p className="eyebrow light"><span />Sponsorship workspace</p><h1>{record.sponsorName}<br /><em>{record.eventTitle}</em></h1><p>Started by {requester[0]?.name ?? "Member"}{target[0] ? ` · benefiting ${target[0].name} (${target[0].role})` : " · event sponsorship"}</p></div>
    <ol className="sponsorship-status-timeline">
      <li className="is-complete"><span>1</span><strong>Offer sent</strong><small>{record.createdAt.toLocaleString()}</small></li>
      <li className={record.status === "declined" ? "is-declined" : record.status !== "pending" ? "is-complete" : "is-current"}><span>2</span><strong>{record.status === "countered" ? "Counteroffer" : record.status === "declined" ? "Declined" : "Decision"}</strong><small>{record.responseNote || (awaitingMe ? "Your response is needed" : "Waiting for the other party")}</small></li>
      <li className={record.agreementId ? agreementComplete ? "is-complete" : "is-current" : ""}><span>3</span><strong>Agreement</strong><small>{record.agreementId ? record.agreementStatus?.replaceAll("_", " ") : "Opens after acceptance"}</small></li>
      <li className={fulfillmentComplete ? "is-complete" : agreementComplete ? "is-current" : ""}><span>4</span><strong>Payment / delivery</strong><small>{record.agreementId ? `Cash: ${record.paymentStatus} · In-kind: ${record.inKindStatus}` : "Not started"}</small></li>
      <li className={fulfillmentComplete ? "is-complete" : ""}><span>5</span><strong>Complete</strong><small>{fulfillmentComplete ? "Closed successfully" : "Awaiting fulfillment"}</small></li>
    </ol>
    <div className="sponsorship-workspace-grid"><article className="sponsorship-offer-summary"><span>OFFER</span><h2>{record.contributionType.replaceAll("_", " ")}</h2><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(record.cashAmountCents / 100)}</strong><p>{record.message}</p>{record.offerDetails && <p><b>Products, services, placement or deliverables:</b> {record.offerDetails}</p>}<div className="sponsorship-package-pills">{record.flightIncluded && <span>✈ Flight</span>}{record.hotelIncluded && <span>▣ Hotel</span>}{record.representationRequired && <span>Representation</span>}</div>{record.representationTerms && <p><b>Representation terms:</b> {record.representationTerms}</p>}<Link href={`/events/${record.eventSlug}`}>View event ↗</Link></article>
      <article className="sponsorship-decision-panel"><span>CURRENT STATUS</span><h2>{record.status.replaceAll("_", " ")}</h2>{awaitingMe ? <RequestDecisionActions id={record.id} kind="sponsorship" /> : ["pending", "countered"].includes(record.status) ? <p>Waiting for the other party to respond.</p> : record.agreementId ? <Link className="button" href={`/sponsorship-agreements/${record.agreementId}`}>Open agreement →</Link> : <p>{record.responseNote || "This request is closed."}</p>}</article>
    </div>
    <SponsorshipConversation requestId={record.id} currentMemberId={member.id} initialMessages={messages} />
  </section><SiteFooter /></main>;
}
