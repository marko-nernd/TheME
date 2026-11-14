import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import AvatarManager from "@/components/avatar-manager";
import BillingPortalButton from "@/components/billing-portal-button";
import CollaborationForm from "@/components/collaboration-form";
import ConversationHistory from "@/components/conversation-history";
import CoverImageManager from "@/components/cover-image-manager";
import DashboardProfileForm from "@/components/dashboard-profile-form";
import { type GuidanceItem } from "@/components/dashboard-guidance";
import DashboardTabs from "@/components/dashboard-tabs";
import DashboardSubtabs from "@/components/dashboard-subtabs";
import ModelEventPhotographers from "@/components/model-event-photographers";
import AccountSettings from "@/components/account-settings";
import MemberHome from "@/components/member-home";
import MemberEventList from "@/components/member-event-list";
import HostPayoutSetup from "@/components/host-payout-setup";
import HostRequestActions from "@/components/host-request-actions";
import HostEventWorkspace from "@/components/host-event-workspace";
import IdentityVerificationForm from "@/components/identity-verification-form";
import MemberReviewForm from "@/components/member-review-form";
import MemberEventTransactions from "@/components/member-event-transactions";
import PortfolioManager from "@/components/portfolio-manager";
import RequestDecisionActions from "@/components/request-decision-actions";
import RestoreSentRequestButton from "@/components/restore-sent-request-button";
import SentRequestDeleteButton from "@/components/sent-request-delete-button";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import SponsorshipRequestForm from "@/components/sponsorship-request-form";
import SponsorLogoManager from "@/components/sponsor-logo-manager";
import SponsorTierAlerts from "@/components/sponsor-tier-alerts";
import {
  getCollaborationInbox,
  getCollaborationMessagesForMember,
  getCollaborationOutbox,
  getDeletedCollaborationOutbox,
  getDashboardProfile,
  getEventParticipationsForMember,
  getEventAttendingPhotographers,
  getEventProposalsForMember,
  getHostedEvents,
  getHostedParticipationRequests,
  getHostEventTransactions,
  getHostedSponsorshipRequests,
  getEligibleReviewTargets,
  getMemberSubscription,
  getMemberEventTransactions,
  getMemberSponsorshipOffers,
  getSponsorForMember,
  getSponsoredEventsForMember,
  getSponsorshipRequestsForMember,
  getSponsors,
  getPendingSponsorTierChanges,
  getSuggestedCollaborators,
  portfolioLimits,
} from "@/db/queries";
import { getCurrentMember } from "@/lib/auth";
import { isHostRole, primaryRoleLabel } from "@/lib/roles";
import { getMemberStripePayments } from "@/lib/stripe-payment-history";
import MemberNotifications from "@/components/member-notifications";
import { memberPlaceholder } from "@/lib/member-placeholder";

export const dynamic = "force-dynamic";

const roleContent = {
  model: {
    eyebrow: "Model workspace",
    headline: "Bookings, visibility, and creative connections.",
    primaryAction: { label: "Find events", href: "/events" },
  },
  photographer: {
    eyebrow: "Photographer workspace",
    headline: "Productions, talent, and portfolio momentum.",
    primaryAction: { label: "Find events", href: "/events" },
  },
  sponsor: {
    eyebrow: "Sponsor workspace",
    headline: "Partnerships, activations, and measurable opportunities.",
    primaryAction: { label: "Find events", href: "/events?sponsorships=1" },
  },
  host: {
    eyebrow: "Host workspace",
    headline: "Create, promote, and operate every event.",
    primaryAction: { label: "Create event", href: "/host/new" },
  },
} as const;

function prettyStatus(value: string) {
  return value.replaceAll("_", " ");
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatCents(cents: number) {
  return currency.format(cents / 100);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; eventPayment?: string; event?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) redirect("/login");
  const { verified, eventPayment, event: editEventId } = await searchParams;
  const role = member.primaryRole;
  const content = roleContent[role as keyof typeof roleContent] ?? roleContent.host;
  const isHost = isHostRole(role);
  const isCreative = role === "model" || role === "photographer";
  const isSimpleMember = isCreative;
  const isSponsor = role === "sponsor";

  const [
    participations,
    hostedEvents,
    hostedRequests,
    sponsorCatalog,
    creativeProfile,
    sponsorProfile,
    sponsorRequests,
    hostedSponsorRequests,
    sponsoredEvents,
    collaborationInbox,
    collaborationOutbox,
    deletedCollaborationOutbox,
    collaborationMessages,
    collaborators,
    subscription,
    eligibleReviewTargets,
    hostTransactions,
    membershipPayments,
    sponsorTierChanges,
    memberEventTransactions,
    memberSponsorshipOffers,
    eventProposals,
  ] = await Promise.all([
    getEventParticipationsForMember(member.id),
    getHostedEvents(member.id),
    getHostedParticipationRequests(member.id),
    getSponsors(),
    getDashboardProfile(member.id),
    getSponsorForMember(member.id),
    getSponsorshipRequestsForMember(member.id),
    getHostedSponsorshipRequests(member.id),
    getSponsoredEventsForMember(member.id),
    getCollaborationInbox(member.id),
    getCollaborationOutbox(member.id),
    getDeletedCollaborationOutbox(member.id),
    getCollaborationMessagesForMember(member.id),
    getSuggestedCollaborators(member.id),
    getMemberSubscription(member.id, member.email),
    getEligibleReviewTargets(member.id),
    isHost ? getHostEventTransactions(member.id) : Promise.resolve([]),
    getMemberStripePayments(member.id, member.email),
    role === "sponsor" ? getPendingSponsorTierChanges(member.id) : Promise.resolve([]),
    getMemberEventTransactions(member.id),
    isCreative ? getMemberSponsorshipOffers(member.id) : Promise.resolve([]),
    isHost ? getEventProposalsForMember(member.id) : Promise.resolve([]),
  ]);

  const modelEvents = role === "model" ? Array.from(new Map(participations.filter((booking) => booking.status === "confirmed" && booking.eventPublished && (booking.priceCents === 0 || booking.transactionStatus === "paid") && (booking.eventEndsAt ?? booking.eventStartsAt).getTime() >= Date.now()).map((booking) => [booking.eventId, booking])).values()).sort((a, b) => a.eventStartsAt.getTime() - b.eventStartsAt.getTime()) : [];
  const modelEventPhotographers = await Promise.all(modelEvents.map(async (booking) => ({ id: booking.eventId, title: booking.eventTitle, slug: booking.eventSlug, photographers: await getEventAttendingPhotographers(booking.eventId) })));
  const firstName = member.name.split(/\s+/)[0];
  const simpleBookings = participations.map((row) => ({ id: row.id, eventTitle: row.eventTitle, eventSlug: row.eventSlug, eventLocation: row.eventLocation, eventStartsAt: row.eventStartsAt.toISOString(), eventEndsAt: row.eventEndsAt?.toISOString() ?? null, status: row.status, priceCents: row.priceCents, transactionId: row.transactionId, transactionStatus: row.transactionStatus, confirmationCode: row.confirmationCode }));
  const conversationGroups = new Map<string, {
    name: string;
    role: string;
    requests: Array<{
      id: string;
      subject: string;
      initialMessage: string;
      initialSenderId: string;
      initialSenderName: string;
      createdAt: Date;
      eventTitle: string | null;
    }>;
  }>();
  for (const request of [...collaborationInbox, ...collaborationOutbox].filter((item) => item.status === "accepted")) {
    const incoming = "senderMemberId" in request;
    const personId = incoming ? request.senderMemberId : request.recipientMemberId;
    const personName = incoming ? request.senderName : request.recipientName;
    const personRole = incoming ? request.senderRole : request.recipientRole;
    const group = conversationGroups.get(personId) ?? { name: personName, role: personRole, requests: [] };
    if (!group.requests.some((item) => item.id === request.id)) {
      group.requests.push({
        id: request.id,
        subject: request.subject,
        initialMessage: request.message,
        initialSenderId: incoming ? request.senderMemberId : member.id,
        initialSenderName: incoming ? request.senderName : member.name,
        createdAt: request.createdAt,
        eventTitle: request.eventTitle,
      });
    }
    conversationGroups.set(personId, group);
  }
  const pendingRoleRequests = role === "sponsor"
    ? sponsorRequests.filter((request) => request.status === "pending").length
    : isHost
      ? hostedRequests.filter((request) => request.status === "pending").length
      : collaborationInbox.filter((request) => request.status === "pending").length;
  const pendingHostedRequests = hostedRequests.filter((request) => request.status === "pending");
  const approvedParticipations = participations.filter((participation) =>
    ["approved", "awaiting_payment"].includes(participation.status) && participation.priceCents > 0
  );
  const pendingEventInvites = collaborationInbox.filter((request) => request.kind === "event_invite" && request.status === "pending").length;
  const pendingEventApplications = participations.filter((participation) => participation.status === "pending").length;
  const serializedHostedRequests = hostedRequests.map((request) => ({
    ...request,
    eventStartsAt: request.eventStartsAt.toISOString(),
    applicantMemberId: request.applicantMemberId,
    applicantAvatarVersion: request.applicantAvatarUpdatedAt?.getTime() ?? null,
    confirmationEmailSentAt: request.confirmationEmailSentAt?.toISOString() ?? null,
    paidAt: request.paidAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  }));
  const hasPublicDetails = role === "sponsor"
    ? Boolean(sponsorProfile?.description && sponsorProfile?.contactName && sponsorProfile?.websiteUrl)
    : Boolean(member.bio && member.homeMarket && member.username);
  const hasRoleMedia = role === "sponsor"
    ? Boolean(sponsorProfile?.hasLogoUpload || sponsorProfile?.logoPath)
    : isCreative
      ? Boolean(creativeProfile?.portfolio.length)
      : true;
  const checklist: GuidanceItem[] = [
    {
      label: "Profile photo",
      detail: "Help collaborators recognize the person or company behind the account.",
      href: "/dashboard#profile",
      complete: Boolean(member.avatarUpdatedAt),
    },
    {
      label: "Identity verification",
      detail: member.identityVerificationStatus === "pending" ? "Your documents are waiting for admin review." : "Verification builds trust across invitations, agreements, and reviews.",
      href: "/dashboard#profile",
      complete: member.identityVerificationStatus === "approved",
    },
    {
      label: role === "sponsor" ? "Company information" : "Public profile",
      detail: role === "sponsor" ? "Complete the brand description, contact, website, and company details." : "Complete the public details collaborators use to evaluate you.",
      href: "/dashboard#profile",
      complete: hasPublicDetails,
    },
    {
      label: role === "sponsor" ? "Downloadable brand logo" : isCreative ? "Portfolio work" : "Event workspace",
      detail: role === "sponsor" ? "Upload the approved PNG, JPG, or SVG hosts can download." : isCreative ? "Add work samples that support applications and invitations." : "Create or manage at least one event.",
      href: role === "sponsor" ? "/dashboard#profile" : isCreative ? "/dashboard#profile" : "/dashboard#events",
      complete: isHost ? hostedEvents.length > 0 : hasRoleMedia,
    },
  ];
  const nextAction = isCreative && approvedParticipations.length > 0
    ? {
        eyebrow: "Payment needed",
        title: `${approvedParticipations.length === 1 ? "Your place is" : "Your places are"} ready to confirm.`,
        detail: "Complete the event payment to confirm your attendance.",
        href: "/dashboard#activity",
        action: "Complete payment",
      }
    : member.identityVerificationStatus !== "approved"
    ? {
        eyebrow: member.identityVerificationStatus === "pending" ? "Waiting on Model Escape" : "Your next action",
        title: member.identityVerificationStatus === "pending" ? "Your verification is under review." : "Verify your identity.",
        detail: member.identityVerificationStatus === "pending" ? "You can keep completing your profile while the admin reviews your documents." : "Upload a passport or driver license to unlock a trusted, verified profile.",
        href: "/dashboard#profile",
        action: member.identityVerificationStatus === "pending" ? "Continue profile setup" : "Start verification",
      }
    : pendingRoleRequests > 0
      ? {
          eyebrow: "Needs your decision",
          title: `${pendingRoleRequests} ${pendingRoleRequests === 1 ? "request is" : "requests are"} waiting.`,
          detail: "Open the exact request queue to accept, decline, message, or continue the agreement.",
          href: isHost ? "/dashboard#events" : isSponsor ? "/dashboard#activity" : "/dashboard#connections",
          action: "Review requests",
        }
      : isHost && hostedEvents.length === 0
        ? { eyebrow: "Your next action", title: "Create your first event.", detail: "Start with the brief, dates, participation paths, capacity, media, pricing, and refund terms.", href: "/host/new", action: "Create event" }
        : role === "sponsor" && sponsoredEvents.length === 0
          ? { eyebrow: "Your next action", title: "Find a sponsorship opportunity.", detail: "Choose an event, model, or photographer and send an offer.", href: "/sponsorships", action: "Find opportunities" }
          : isSimpleMember && participations.length === 0
            ? { eyebrow: "Your next action", title: "Find your first event.", detail: "Choose an event, review the price and optional stay, then pay to confirm your place.", href: "/events", action: "Browse events" }
            : { eyebrow: "Everything is moving", title: "Continue your active work.", detail: "Your setup is ready. Open activity for invitations, applications, sponsorships, agreements, and attendance status.", href: "/dashboard#activity", action: "Open activity" };

  const overviewCopy = isHost
    ? {
        eyebrow: "HOST DASHBOARD",
        title: "Run your events from one place.",
        detail: "Start with the next action below, then use the three shortcuts for everyday work.",
        cta: "Create event",
        ctaHref: "/host/new",
        ctaHelp: "Create a new event proposal with dates, pricing, capacity, media, and participation paths.",
      }
    : isSponsor
      ? {
          eyebrow: "SPONSOR DASHBOARD",
          title: "Find and manage partnerships.",
          detail: "Your opportunities, active partnerships, and messages are organized into clear work areas.",
          cta: "Find opportunities",
          ctaHref: "/sponsorships",
          ctaHelp: "Choose an event, model, or photographer to sponsor.",
        }
      : {
          eyebrow: `${primaryRoleLabel(role).toUpperCase()} DASHBOARD`,
          title: "What needs your attention?",
          detail: "Your next step and the tools you use most are kept together.",
          cta: "Find events",
          ctaHref: "/events",
          ctaHelp: "Browse upcoming events that are still accepting participants.",
        };

  const overviewActions = isHost
    ? [
        {
          eyebrow: "EVENTS",
          value: `${hostedEvents.length} ${hostedEvents.length === 1 ? "event" : "events"}`,
          detail: "Create events, check proposal status, edit details, and manage participants.",
          action: "Manage events",
          href: "/dashboard#events",
          help: "Open your events, proposals, participant lists, and event controls.",
        },
        {
          eyebrow: "APPROVALS",
          value: `${pendingHostedRequests.length} waiting`,
          detail: "Review the models and photographers waiting for your decision.",
          action: "Review people",
          href: "/dashboard#events",
          help: "Review pending participation requests grouped by event.",
        },
        {
          eyebrow: "INBOX",
          value: `${conversationGroups.size} ${conversationGroups.size === 1 ? "conversation" : "conversations"}`,
          detail: "Keep messages with models, photographers, and sponsors together.",
          action: "Open inbox",
          href: "/dashboard#connections",
          help: "Open collaboration requests and message history.",
        },
      ]
    : isSponsor
      ? [
          {
            eyebrow: "OPPORTUNITIES",
            value: `${sponsorRequests.filter((request) => request.status === "pending").length} open`,
            detail: "Review offers and sponsorship requests that need a decision.",
            action: "Review requests",
            href: "/dashboard#activity",
            help: "Review incoming and outgoing sponsorship requests and agreements.",
          },
          {
            eyebrow: "PARTNERSHIPS",
            value: `${sponsoredEvents.length} active`,
            detail: "See the events, models, and photographers your company supports.",
            action: "View partnerships",
            href: "/dashboard#activity",
            help: "Open active sponsorships, agreements, and supported events.",
          },
          {
            eyebrow: "INBOX",
            value: `${conversationGroups.size} ${conversationGroups.size === 1 ? "conversation" : "conversations"}`,
            detail: "Talk with hosts and creatives without leaving your dashboard.",
            action: "Open inbox",
            href: "/dashboard#connections",
            help: "Open collaboration requests and message history.",
          },
        ]
      : [
          {
            eyebrow: "EVENTS",
            value: approvedParticipations.length > 0 ? `${approvedParticipations.length} to pay` : pendingEventApplications + pendingEventInvites > 0 ? `${pendingEventApplications + pendingEventInvites} waiting` : `${participations.filter((item) => item.status === "confirmed").length} confirmed`,
            detail: "Invitations, payments, confirmed bookings, and event history.",
            action: "Open events",
            href: "/dashboard#activity",
            help: "See invitations, payment requirements, confirmed bookings, and completed events.",
          },
          {
            eyebrow: "INBOX",
            value: `${collaborationInbox.filter((request) => request.status === "pending").length} new`,
            detail: "Messages and requests from members and event hosts.",
            action: "Open inbox",
            href: "/dashboard#connections",
            help: "Read conversations and respond to new collaboration requests.",
          },
          {
            eyebrow: "PROFILE",
            value: `${checklist.filter((item) => item.complete).length}/${checklist.length} ready`,
            detail: "Public details, selected work, verification, and billing.",
            action: "Manage profile",
            href: "/dashboard#profile",
            help: "Update your public profile, portfolio, verification, and account settings.",
          },
        ];

  return (
    <main className={isSimpleMember ? "simple-member-dashboard" : undefined}>
      <SiteHeader inner />
      <section className={`role-dashboard-hero role-${role}`} id="top">
        <div>
          <p className="eyebrow light"><span />{content.eyebrow}</p>
          <h1>Welcome, {firstName}.</h1>
          <p>{content.headline}</p>
        </div>
        <div className="role-dashboard-identity">
          <div className="dashboard-avatar">
            {member.avatarUpdatedAt ? (
              <Image
                unoptimized
                src={`/api/members/${member.id}/avatar?v=${member.avatarUpdatedAt.getTime()}`}
                alt={`${member.name} profile thumbnail`}
                width={82}
                height={82}
              />
            ) : (
              <Image
                unoptimized
                src={memberPlaceholder(role)}
                alt={`${primaryRoleLabel(role)} placeholder`}
                width={82}
                height={82}
              />
            )}
          </div>
          <span>{primaryRoleLabel(role)}</span>
          <strong>{member.name}</strong>
          <small>{member.homeMarket} · @{member.username}</small>
          <Link className="button button-light" href={content.primaryAction.href}>
            {content.primaryAction.label} ↗
          </Link>
        </div>
      </section>

      {verified === "1" && <div className="dashboard-verification"><strong>Email verified.</strong> Your account is active.</div>}
      {eventPayment === "success" && <div className="dashboard-verification"><strong>Payment received.</strong> Your participation is being confirmed.</div>}
      {isSponsor && <SponsorTierAlerts changes={sponsorTierChanges.map((change) => ({ ...change, createdAt: change.createdAt.toISOString() }))} />}
      {!isHost && <div className="dashboard-notifications"><MemberNotifications /></div>}

      <DashboardTabs tabs={[
        { id: "overview", label: "Home", description: "Start with your next action, then choose a section below." },
        ...(isHost ? [{ id: "events", label: "Manage events", description: "Edit your events and open a participant to see payment and confirmation details." }] : []),
        { id: "activity", label: isSimpleMember ? "My events" : isSponsor ? "Partnerships" : "Sponsors", description: isSimpleMember ? "Open an event to see its details, complete a payment, or view your confirmation and receipt." : "Open a partnership to read the offer, message the other party, and review the agreement." },
        { id: "connections", label: "Inbox", description: "Read your conversations or respond to a new introduction." },
        ...(!isSimpleMember && eligibleReviewTargets.length > 0 ? [{ id: "reviews", label: "Reviews" }] : []),
        ...(!isSimpleMember ? [{ id: "billing", label: "Billing", description: "Check your membership, payment history, and downloadable receipts." }] : []),
        { id: "settings", label: "Settings", description: "Manage profile credits, download your files, and confirm account deletion." },
        { id: "profile", label: "Profile", description: "Choose a section to update your public details, photos, or verification. Save each form after making changes." },
        ...(isSimpleMember ? [{ id: "billing", label: "Billing", description: "Check your membership, event payments, and downloadable receipts." }] : []),
      ]}>
      <div className="dashboard-tab-panel dashboard-tab-panel-overview" id="dashboard-panel-overview" role="tabpanel">
          {isSimpleMember ? <MemberHome now={new Date().getTime()} bookings={simpleBookings} requests={pendingRoleRequests} conversations={Array.from(conversationGroups.values()).map((group) => ({ name: group.name, subject: group.requests[0]?.subject ?? "Open conversation" }))} photoReady={Boolean(member.avatarUpdatedAt)} profileReady={hasPublicDetails} /> : <section className="creative-dashboard-home" aria-labelledby="dashboard-home-title">
            <header>
              <div>
                <span>{overviewCopy.eyebrow}</span>
                <h2 id="dashboard-home-title">{overviewCopy.title}</h2>
                <p>{overviewCopy.detail}</p>
              </div>
              <Link className="button dashboard-help-link" data-help={overviewCopy.ctaHelp} href={overviewCopy.ctaHref}>{overviewCopy.cta} →</Link>
            </header>
            <Link className="creative-next-action dashboard-help-link" data-help={nextAction.detail} href={nextAction.href}>
              <span>{nextAction.eyebrow}</span>
              <strong>{nextAction.title}</strong>
              <small>{nextAction.detail}</small>
              <b>{nextAction.action} →</b>
            </Link>
            <div className="creative-dashboard-actions">
              {overviewActions.map((item) => (
                <Link className="dashboard-help-link" data-help={item.help} href={item.href} key={item.eyebrow}>
                  <span>{item.eyebrow}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                  <b>{item.action} →</b>
                </Link>
              ))}
            </div>
          </section>}
        {role === "model" && <ModelEventPhotographers events={modelEventPhotographers} />}
        {isHost && (
          <section className="host-approval-quick-access" aria-labelledby="host-approval-title">
            <header>
              <div><span>HOST APPROVALS</span><h2 id="host-approval-title">People waiting to join.</h2></div>
              <Link href="/dashboard#events">Open full event queue →</Link>
            </header>
            <div className="host-approval-quick-list">
              {pendingHostedRequests.length ? pendingHostedRequests.slice(0, 4).map((request) => (
                <article key={`quick-${request.id}`}>
                  <div className="host-request-avatar">
                    {request.applicantAvatarUpdatedAt ? (
                      <Image unoptimized src={`/api/members/${request.applicantMemberId}/avatar?v=${request.applicantAvatarUpdatedAt.getTime()}`} alt="" width={48} height={48} />
                    ) : <Image unoptimized src={memberPlaceholder(request.pathType)} alt="" width={48} height={48} />}
                  </div>
                  <div>
                    <strong>{request.applicantName}</strong>
                    <small>{request.pathType} · <Link href={`/events/${request.eventSlug}`}>{request.eventTitle}</Link></small>
                  </div>
                  <HostRequestActions participationId={request.id} status={request.status} participantName={request.applicantName} />
                </article>
              )) : <p className="dashboard-empty">No members are waiting for approval.</p>}
            </div>
          </section>
        )}
      </div>

      {isHost && (
        <div className="dashboard-tab-panel dashboard-tab-panel-events" id="dashboard-panel-events" role="tabpanel">
          <HostEventWorkspace initialEventId={editEventId} proposals={eventProposals.map((proposal) => ({
            ...proposal,
            createdAt: proposal.createdAt.toISOString(),
            updatedAt: proposal.updatedAt.toISOString(),
          }))} events={hostedEvents.map((event) => ({
            ...event,
            startsAt: event.startsAt.toISOString(),
            endsAt: event.endsAt?.toISOString() ?? null,
            createdAt: undefined,
            updatedAt: event.updatedAt.toISOString(),
          }))} paidClients={hostTransactions.map((transaction) => ({
            ...transaction,
            paidAt: transaction.paidAt.toISOString(),
          }))} requests={serializedHostedRequests} sponsorPanels={Object.fromEntries(hostedEvents.map((event) => [event.id, <div key={event.id} className="event-hub-sponsors"><SponsorshipRequestForm direction="promoter_to_sponsor" event={{ id: event.id, title: event.title }} sponsors={sponsorCatalog.map((sponsor) => ({ id: sponsor.id, name: sponsor.name, category: sponsor.category }))} /><h3>Offers and agreements</h3>{hostedSponsorRequests.filter((request) => request.eventId === event.id).map((request) => <article key={request.id}><strong>{request.sponsorName}</strong><p>{prettyStatus(request.status)}</p><Link className="button" href={`/sponsorship-requests/${request.id}`}>Open partnership →</Link></article>)}</div>]))} />
        </div>
      )}

      <div className="dashboard-tab-panel dashboard-tab-panel-activity" id="dashboard-panel-activity" role="tabpanel">
        <section className="dashboard-workspace" id="activity">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span />Role activity</p>
            <h2>{role === "sponsor" ? "Manage partnerships." : isHost ? "Your event sponsors." : "Your invitations and bookings."}</h2>
          </div>
          <p className="section-intro">
            {isSimpleMember ? "See invitations, payments, confirmed bookings, and completed events in one list." : "Everything here is scoped to your account. Decisions update the event, sponsor, and member records used across the platform."}
          </p>
        </div>

        {isSimpleMember && (
          <div className="dashboard-panel-grid creative-activity-grid">
            <article className="dashboard-list-panel">
              <header><span>MY EVENTS</span><h3>Invitations and bookings</h3></header>
              {collaborationInbox.filter((request) => request.kind === "event_invite").map((request) => (
                <div className="dashboard-list-row event-invite-row" key={`invite-${request.id}`}>
                  <div>
                    {request.eventSlug ? <Link href={`/events/${request.eventSlug}`}>{request.eventTitle || request.subject}</Link> : <strong>{request.subject}</strong>}
                    <small>Invited by {request.senderName} · {prettyStatus(request.status)}</small>
                    <p>{request.message}</p>
                  </div>
                  {request.status === "pending" && <RequestDecisionActions id={request.id} kind="collaboration" />}
                </div>
              ))}
              <MemberEventList now={new Date().getTime()} bookings={simpleBookings} />
              <Link className="quiet-dark-link dashboard-help-link" data-help="Browse upcoming events with an available path for your account type." href="/events">Browse events →</Link>
            </article>
            {isCreative && <details className="member-sponsor-offers"><summary>Sponsorship offers ({memberSponsorshipOffers.length})</summary><article className="dashboard-list-panel">
              <header><span>SPONSORSHIP OFFERS</span><h3>Travel, cash and representation</h3></header>
              {memberSponsorshipOffers.length ? memberSponsorshipOffers.map((offer) => (
                <div className="dashboard-request-card" key={`member-sponsor-${offer.id}`}>
                  <div>
                    <Link href={`/events/${offer.eventSlug}`}>{offer.sponsorName} · {offer.eventTitle}</Link>
                    <small>{prettyStatus(offer.status)} · {prettyStatus(offer.contributionType)}</small>
                    <p>{offer.message}</p>
                    <div className="sponsorship-package-pills">
                      {offer.flightIncluded && <span>✈ Flight</span>}
                      {offer.hotelIncluded && <span>▣ Hotel</span>}
                      {offer.cashAmountCents > 0 && <span>{formatCents(offer.cashAmountCents)} cash</span>}
                      {offer.representationRequired && <span>Representation</span>}
                    </div>
                    {offer.representationRequired && <p><strong>Representation terms:</strong> {offer.representationTerms}</p>}
                    <Link className="quiet-dark-link" href={`/sponsorship-requests/${offer.id}`}>Open sponsorship workspace →</Link>
                    {["pending", "countered"].includes(offer.status) && (offer.responseMemberId ?? offer.requesterMemberId) !== member.id && <RequestDecisionActions id={offer.id} kind="sponsorship" />}
                  </div>
                  {offer.agreementId
                    ? <Link className="quiet-dark-link" href={`/sponsorship-agreements/${offer.agreementId}`}>Review agreement →</Link>
                    : <small>The host or sponsor must accept the request before the agreement opens.</small>}
                </div>
              )) : <p className="dashboard-empty">No sponsorship offers yet.</p>}
            </article></details>}
          </div>
        )}

        {isSimpleMember && eligibleReviewTargets.length > 0 && (
          <section className="dashboard-reviews-section dashboard-inline-reviews" id="reviews">
            <div className="section-heading">
              <div><p className="eyebrow"><span />Completed events</p><h2>Leave an event review.</h2></div>
              <p className="section-intro">Reviews appear here only after an eligible event is completed.</p>
            </div>
            <div className="member-review-grid">
              {eligibleReviewTargets.map((target) => <MemberReviewForm key={`${target.event_id}-${target.member_id}`} target={{ eventId: target.event_id, eventTitle: target.event_title, memberId: target.member_id, name: target.name, role: target.role, reviewerIsHost: target.reviewer_is_host }} />)}
            </div>
          </section>
        )}

        {isHost && (
          <>
            {hostedEvents.map((event) => (
              <SponsorshipRequestForm
                direction="promoter_to_sponsor"
                event={{ id: event.id, title: event.title }}
                sponsors={sponsorCatalog.map((sponsor) => ({ id: sponsor.id, name: sponsor.name, category: sponsor.category }))}
                key={`sponsor-${event.id}`}
              />
            ))}
            <div className="dashboard-request-feed">
              <h3>Sponsor conversations</h3>
              {hostedSponsorRequests.length ? hostedSponsorRequests.map((request) => (
                <article key={request.id}>
                  <div><strong>{request.sponsorName} · {request.eventTitle}{request.targetName ? ` · for ${request.targetName}` : ""}</strong><p>{request.message}</p><div className="sponsorship-package-pills">{request.flightIncluded && <span>✈ Flight</span>}{request.hotelIncluded && <span>▣ Hotel</span>}{request.cashAmountCents > 0 && <span>{formatCents(request.cashAmountCents)} cash</span>}{request.representationRequired && <span>Representation</span>}</div>{request.hasLogoUpload && <a href={`/api/sponsors/${request.sponsorId}/logo?download=1`} download>Download sponsor logo{request.logoFilename ? ` · ${request.logoFilename}` : ""}</a>}<Link className="quiet-dark-link" href={`/sponsorship-requests/${request.id}`}>Open sponsorship workspace →</Link></div>
                  <div><span>{prettyStatus(request.status)}</span>{["pending", "countered"].includes(request.status) && (request.responseMemberId ?? request.requesterMemberId) !== member.id && <RequestDecisionActions id={request.id} kind="sponsorship" />}{request.agreementId && <Link href={`/sponsorship-agreements/${request.agreementId}`}>Agreement →</Link>}</div>
                </article>
              )) : <p className="dashboard-empty">No sponsor conversations yet.</p>}
            </div>
          </>
        )}

        {role === "sponsor" && (
          <div className="dashboard-panel-grid">
            <article className="dashboard-list-panel">
              <header><span>PARTNERSHIP INBOX</span><h3>Event sponsorship requests</h3></header>
              {sponsorRequests.length ? sponsorRequests.map((request) => (
                <div className="dashboard-request-card" key={request.id}>
                  <div>
                    <Link href={`/events/${request.eventSlug}`}>{request.eventTitle}</Link>
                    <small>{prettyStatus(request.direction)} · {prettyStatus(request.status)}</small>
                    <p>{request.message}</p>
                    <div className="sponsorship-package-pills">
                      {request.flightIncluded && <span>✈ Flight</span>}
                      {request.hotelIncluded && <span>▣ Hotel</span>}
                      {request.cashAmountCents > 0 && <span>{formatCents(request.cashAmountCents)} cash</span>}
                      {request.representationRequired && <span>Representation{request.targetName ? ` · ${request.targetName}` : ""}</span>}
                    </div>
                    <p className="sponsor-contact-note">
                      Contact event host: {request.hostEmail
                        ? <a href={`mailto:${request.hostEmail}`}>{request.hostEmail}</a>
                        : "Contact unavailable"}
                    </p>
                    <Link className="quiet-dark-link" href={`/sponsorship-requests/${request.id}`}>Open sponsorship workspace →</Link>
                  </div>
                  {["pending", "countered"].includes(request.status) && (request.responseMemberId ?? request.requesterMemberId) !== member.id && <RequestDecisionActions id={request.id} kind="sponsorship" />}
                  {request.agreementId && <Link className="quiet-dark-link" href={`/sponsorship-agreements/${request.agreementId}`}>Open agreement →</Link>}
                </div>
              )) : <p className="dashboard-empty">No sponsorship requests yet.</p>}
            </article>
            <article className="dashboard-list-panel">
              <header><span>ACTIVE PARTNERSHIPS</span><h3>Sponsored events</h3></header>
              {sponsoredEvents.length ? sponsoredEvents.map((event) => (
                <div className="dashboard-list-row" key={event.id}>
                  <div><Link href={`/events/${event.slug}`}>{event.title}</Link><small>{event.level} · {event.location}</small></div>
                </div>
              )) : <p className="dashboard-empty">No confirmed sponsorships yet.</p>}
              <Link className="quiet-dark-link" href="/events?sponsorships=1">Discover sponsorship opportunities →</Link>
              <Link className="quiet-dark-link" href="/sponsorships">Find an event or creative to sponsor →</Link>
            </article>
          </div>
        )}
        </section>
      </div>

      <div className="dashboard-tab-panel dashboard-tab-panel-connections" id="dashboard-panel-connections" role="tabpanel">
        <section className="dashboard-connections" id="connections">
        <div className="section-heading">
          <div><p className="eyebrow"><span />Inbox</p><h2>Your conversations and requests.</h2></div>
          <p className="section-intro">Accept an introduction to start a conversation. Event invitations also appear in your event list.</p>
        </div>
        <DashboardSubtabs label="Inbox sections" defaultActive="history" items={[
          ...([{ id: "reach-out", label: "New message", content: <CollaborationForm
            collaborators={collaborators}
            hostedEvents={hostedEvents.map((event) => ({ id: event.id, title: event.title }))}
            roleLabel={primaryRoleLabel(role)}
          /> }]),
          { id: "incoming", label: "Requests", content: <div className="dashboard-request-feed">
            <h3>{isSimpleMember ? "Requests" : "Incoming requests"}</h3>
            {collaborationInbox.length ? collaborationInbox.map((request) => (
              <article key={request.id}>
                <div>
                  <strong>{request.senderName} · {primaryRoleLabel(request.senderRole)}</strong>
                  <small>{request.subject}{request.eventTitle ? ` · ${request.eventTitle}` : ""}</small>
                  <p>{request.message}</p>
                </div>
                <div>
                  <span>{prettyStatus(request.status)}</span>
                  {request.status === "pending" && <RequestDecisionActions id={request.id} kind="collaboration" />}
                </div>
              </article>
            )) : <p className="dashboard-empty">No incoming introductions.</p>}
          </div> },
          { id: "sent", label: "Sent", content: <div className="dashboard-request-feed">
            {collaborationOutbox.length === 0 && <p className="dashboard-empty">No sent requests yet. Choose New message to start a conversation.</p>}
            {collaborationOutbox.length > 0 && (
              <details>
                <summary>Sent requests ({collaborationOutbox.length})</summary>
                <div className="sent-request-list">
                  {collaborationOutbox.map((request) => (
                    <article key={request.id}>
                      <div>
                        <strong>{request.recipientName}</strong>
                        <small>{request.subject}{request.eventTitle ? ` · ${request.eventTitle}` : ""}</small>
                        <p>{request.message}</p>
                      </div>
                      <div className="sent-request-status">
                        <span>{prettyStatus(request.status)}</span>
                        {request.status === "declined" && (
                          <SentRequestDeleteButton requestId={request.id} recipientName={request.recipientName} />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            )}
            {deletedCollaborationOutbox.length > 0 && (
              <details className="deleted-request-folder">
                <summary>Deleted ({deletedCollaborationOutbox.length})</summary>
                <p>Requests here are permanently deleted 30 days after removal.</p>
                <div className="sent-request-list">
                  {deletedCollaborationOutbox.map((request) => (
                    <article key={request.id}>
                      <div>
                        <strong>{request.recipientName}</strong>
                        <small>{request.subject}{request.eventTitle ? ` · ${request.eventTitle}` : ""}</small>
                        <p>Permanent deletion {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(request.purgeAt))}</p>
                      </div>
                      <RestoreSentRequestButton requestId={request.id} />
                    </article>
                  ))}
                </div>
              </details>
            )}
          </div> },
          { id: "history", label: "Messages", content: <ConversationHistory
          currentMemberId={member.id}
          people={Array.from(conversationGroups.entries()).map(([personId, group]) => {
            const requests = group.requests.map((request) => ({
              ...request,
              createdAt: request.createdAt.toISOString(),
              messages: collaborationMessages
                .filter((message) => message.requestId === request.id)
                .map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })),
            }));
            const latestAt = requests
              .flatMap((request) => [request.createdAt, ...request.messages.map((message) => message.createdAt)])
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? new Date(0).toISOString();
            return {
              id: personId,
              name: group.name,
              roleLabel: primaryRoleLabel(group.role),
              latestAt,
              requests,
            };
          }).sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())}
        /> },
        ].sort((a, b) => ["history", "incoming", "sent", "reach-out"].indexOf(a.id) - ["history", "incoming", "sent", "reach-out"].indexOf(b.id))} />
        </section>
      </div>

      {eligibleReviewTargets.length > 0 && (
        <div className="dashboard-tab-panel dashboard-tab-panel-reviews" id="dashboard-panel-reviews" role="tabpanel">
          <section className="dashboard-reviews-section" id="reviews">
            <div className="section-heading">
              <div><p className="eyebrow"><span />Verified event ratings</p><h2>Review completed collaborations.</h2></div>
              <p className="section-intro">Only confirmed participants and event hosts can review after an event. No-show reports can only be submitted by the host.</p>
            </div>
            <div className="member-review-grid">
              {eligibleReviewTargets.map((target) => (
                <MemberReviewForm
                  key={`${target.event_id}-${target.member_id}`}
                  target={{
                    eventId: target.event_id,
                    eventTitle: target.event_title,
                    memberId: target.member_id,
                    name: target.name,
                    role: target.role,
                    reviewerIsHost: target.reviewer_is_host,
                  }}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="dashboard-tab-panel dashboard-tab-panel-billing" id="dashboard-panel-billing" role="tabpanel">
        <DashboardSubtabs label="Billing sections" items={[
          ...(isHost ? [{ id: "payouts", label: "Event payouts", content: <HostPayoutSetup /> }] : []),
          { id: "plan", label: "Membership plan", content: <section className="dashboard-billing-section" id="billing">
        <div>
          <p className="eyebrow"><span />Membership billing</p>
          <h2>{subscription ? `${prettyStatus(subscription.plan)} membership.` : "Basic membership."}</h2>
          <p>
            {subscription
              ? subscription.adminManaged
                ? `${prettyStatus(subscription.status)} · recurring payment ${subscription.lastPaymentStatus}`
                : `${prettyStatus(subscription.status)} · ${subscription.lastPaymentStatus} payment${subscription.currentPeriodEnd ? ` · current period ends ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(subscription.currentPeriodEnd)}` : ""}`
              : "You are currently using the free Basic plan."}
          </p>
          {subscription?.cancelAtPeriodEnd && <small>Your membership is scheduled to end after the current billing period.</small>}
        </div>
        <div>
          {subscription && !subscription.adminManaged ? <BillingPortalButton /> : !subscription ? <Link className="button" href={role === "sponsor" ? "/membership/sponsor" : "/membership"}>{role === "sponsor" ? "View sponsor plans ↗" : "Compare paid plans ↗"}</Link> : null}
          <span>{subscription?.adminManaged ? "This membership is managed by an administrator and does not require Stripe billing." : "Stripe’s secure portal manages payment methods, invoices, plan changes, and cancellation."}</span>
        </div>
        </section> },
          { id: "history", label: "Payment history", content: <section className="member-payment-history">
          <div className="section-heading">
            <div><p className="eyebrow"><span />Payment history</p><h2>Your recent membership payments.</h2></div>
            <p className="section-intro">Stripe-backed records are shown inside Model Escape. Downloads are securely proxied after your account is verified.</p>
          </div>
          <div className="member-payment-list">
            {membershipPayments.length ? membershipPayments.map((payment) => (
              <article key={payment.id}>
                <div>
                  <strong>{payment.description}</strong>
                  <small>{payment.number ? `Invoice ${payment.number} · ` : ""}{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(payment.paidAt)}</small>
                </div>
                <b>{new Intl.NumberFormat("en-US", { style: "currency", currency: payment.currency.toUpperCase() }).format(payment.amountPaid / 100)}</b>
                <span className="payment-status-paid">{payment.status}</span>
                <div className="member-payment-actions">
                  {payment.hasDocument ? <>
                    <a href={`/api/billing/documents/${payment.id}?type=receipt`} download>Download receipt</a>
                    <a href={`/api/billing/documents/${payment.id}?type=invoice`} download>Download invoice</a>
                  </> : <small>Document processing</small>}
                </div>
              </article>
            )) : <p className="dashboard-empty">No completed Stripe membership payments yet.</p>}
          </div>
        </section> },
          { id: "event-payments", label: "Event payments", content:
            <MemberEventTransactions transactions={memberEventTransactions.map((transaction) => ({
              ...transaction,
              pathType: transaction.pathType ?? "event",
              paidAt: transaction.paidAt.toISOString(),
            }))} />
          },
          ...(isHost ? [{ id: "events", label: "Event transactions", content: <section className="host-transaction-billing" key="events">
          <div className="section-heading">
            <div><p className="eyebrow"><span />Event billing</p><h2>Local checkout transactions.</h2></div>
            <p className="section-intro">Customers pay the disclosed booking and processing fee. Your event price remains your recorded proceeds. Externally redirected events do not appear here.</p>
          </div>
          <div className="host-transaction-totals">
            <article><span>Gross</span><strong>{formatCents(hostTransactions.reduce((total, row) => total + row.grossCents, 0))}</strong></article>
            <article><span>Customer service fees</span><strong>{formatCents(hostTransactions.reduce((total, row) => total + row.customerFeeCents, 0))}</strong></article>
            <article><span>Your net</span><strong>{formatCents(hostTransactions.reduce((total, row) => total + row.hostNetCents, 0))}</strong></article>
          </div>
          <div className="host-transaction-list">
            {hostTransactions.length ? hostTransactions.map((transaction) => (
              <article key={transaction.id}>
                <div><strong>{transaction.eventTitle}</strong><small>{transaction.payerName ?? "Deleted member"} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(transaction.paidAt)}</small></div>
                <dl><div><dt>Customer paid</dt><dd>{formatCents(transaction.grossCents)}</dd></div><div><dt>Service fee</dt><dd>{formatCents(transaction.customerFeeCents)}</dd></div><div><dt>Your proceeds</dt><dd>{formatCents(transaction.hostNetCents)}</dd></div></dl>
              </article>
            )) : <p className="dashboard-empty">No local event payments yet.</p>}
          </div>
        </section> }] : []),
        ]} />
      </div>

      <div className="dashboard-tab-panel dashboard-tab-panel-profile" id="dashboard-panel-profile" role="tabpanel">
        <section className="dashboard-profile-section" id="profile">
        <DashboardSubtabs label="Profile sections" defaultActive={isSponsor ? "public" : "details"} items={isSimpleMember ? [
          { id: "details", label: "Profile details", content: <>
            {isCreative && creativeProfile && <CoverImageManager currentUrl={creativeProfile.profile.imagePath} />}
            <DashboardProfileForm member={member} creative={creativeProfile?.profile ?? null} sponsor={sponsorProfile} />
          </> },
          ...(isCreative && creativeProfile ? [{ id: "portfolio", label: "Portfolio", content: <PortfolioManager
            items={creativeProfile.portfolio}
            tier={subscription?.plan || creativeProfile.profile.membershipTier}
            limit={portfolioLimits[(subscription?.plan || creativeProfile.profile.membershipTier) as keyof typeof portfolioLimits] ?? 0}
          /> }] : []),
          { id: "photo", label: "Profile photo", content: <AvatarManager memberId={member.id} name={member.name} role={role} version={member.avatarUpdatedAt?.getTime() ?? null} /> },
          { id: "verification", label: "Verification", content: <IdentityVerificationForm status={member.identityVerificationStatus} reviewNotes={member.identityReviewNotes} /> },
        ] : isSponsor ? [
          { id: "photo", label: "Profile photo", content: <AvatarManager memberId={member.id} name={member.name} role={role} version={member.avatarUpdatedAt?.getTime() ?? null} /> },
          { id: "verification", label: "Verification", content: <IdentityVerificationForm status={member.identityVerificationStatus} reviewNotes={member.identityReviewNotes} /> },
          ...([
          ["public", "Public profile"],
          ["contact", "Contact information"],
          ["company", "Company information"],
          ["brand", "Sponsorships and brand guidelines"],
        ] as const).map(([id, label]) => ({ id, label, content: <>
          {id === "company" && sponsorProfile && <SponsorLogoManager sponsorId={sponsorProfile.id} filename={sponsorProfile.logoFilename} hasUpload={sponsorProfile.hasLogoUpload} />}
          <DashboardProfileForm member={member} creative={null} sponsor={sponsorProfile} sponsorSection={id} />
        </> })),
        ] : [
          { id: "details", label: "Profile details", content: <DashboardProfileForm member={member} creative={null} sponsor={null} /> },
          { id: "photo", label: "Profile photo", content: <AvatarManager memberId={member.id} name={member.name} role={role} version={member.avatarUpdatedAt?.getTime() ?? null} /> },
          { id: "verification", label: "Verification", content: <IdentityVerificationForm status={member.identityVerificationStatus} reviewNotes={member.identityReviewNotes} /> },
        ]} />
        </section>
      </div>
      <div className="dashboard-tab-panel dashboard-tab-panel-settings" id="dashboard-panel-settings" role="tabpanel"><AccountSettings email={member.email}/></div>
      </DashboardTabs>

      <form className="dashboard-signout" action="/api/auth/logout" method="post">
        <button className="quiet-dark-link" type="submit">Sign out →</button>
      </form>
      <SiteFooter />
    </main>
  );
}
