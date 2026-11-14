"use client";
import AdminActivityStats from "@/components/admin-activity-stats";
import ComplimentaryEventPlace from "@/components/complimentary-event-place";
import { shootTypeOptions } from "@/lib/shoot-types";
import AvatarManager from "@/components/avatar-manager";
import SocialProfileInput from "@/components/social-profile-input";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import AdminNavIcon from "@/components/admin-nav-icon";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { eventTypeOptions } from "@/lib/event-types";
import { memberPlaceholder } from "@/lib/member-placeholder";
import LocationAutocomplete from "@/components/location-autocomplete";
import ParticipationPathEditor from "@/components/participation-path-editor";
import AdminSystemMonitor from "@/components/admin-system-monitor";
import AdminHeroManager, { type AdminHeroSlide } from "@/components/admin-hero-manager";
import AdminMediaLibrary from "@/components/admin-media-library";
import type { AdminMediaItem } from "@/lib/admin-media-library";
import AdminRatingManager, { type AdminRatingRow } from "@/components/admin-rating-manager";
import AdminPageManager, { type AdminPageSetting } from "@/components/admin-page-manager";
import AdminBrandingManager from "@/components/admin-branding-manager";
import type { SiteBranding } from "@/lib/site-branding";
import AdminDatabaseBackup from "@/components/admin-database-backup";
import AdminSponsorTierControl from "@/components/admin-sponsor-tier-control";
import DeleteEventButton from "@/components/delete-event-button";
import EventTravelEditor from "@/components/event-travel-editor";
import AttendeeFlightDetails from "@/components/attendee-flight-details";
import { travelFromForm, type EventTravelDetails } from "@/lib/event-travel-fields";
import EventMediaPicker, { EventMediaManager, type PreparedEventMedia } from "@/components/event-media-picker";
import type { ParticipationPathInput } from "@/lib/participation";
import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  proportional,
  Table,
  type TableColumn,
} from "@astryxdesign/core/Table";

const adminSections = [
  { id: "overview", label: "Overview", group: "Workspace", description: "Start with pending approvals and the latest platform activity." },
  { id: "stats", label: "Activity stats", group: "Workspace", description: "View daily and hourly member activity and see which models and photographers are active." },
  { id: "users", label: "Users & verification", group: "Manage", description: "Find members, edit accounts, review identities, and inspect the audit trail." },
  { id: "events", label: "Events", group: "Manage", description: "Manage published events, review proposals, and view deletion history." },
  { id: "sponsors", label: "Sponsorships", group: "Manage", description: "Review sponsor profiles, membership levels, and partnership requests." },
  { id: "messages", label: "Messages", group: "Manage", description: "Search member conversations and review communication history." },
  { id: "ratings", label: "Reviews & ratings", group: "Manage", description: "Review collaboration feedback and moderate reported ratings." },
  { id: "billing", label: "Billing & payments", group: "Manage", description: "Track memberships, recent payments, and event transactions." },
  { id: "pages", label: "Website pages", group: "Website", description: "Edit public page copy, header colors, and page images." },
  { id: "homepage", label: "Homepage slides", group: "Website", description: "Edit and reorder the homepage image and video slideshow." },
  { id: "branding", label: "Branding & menus", group: "Website", description: "Manage platform identity, theme styling, and dropdown menu images." },
  { id: "media", label: "Media library", group: "Website", description: "Browse images and videos, check their usage, and manage unused media." },
  { id: "system", label: "System & backups", group: "Operations", description: "Check server health, run local load tests, manage API settings, and export backups." },
] as const;
type AdminSection = typeof adminSections[number]["id"];

type ProposalRow = Record<string, unknown> & {
  id: string;
  title: string;
  type: string;
  location: string;
  lead: string;
  role: string;
  email: string;
  budget: string;
  status: string;
  rejectionReason: string;
  createdAt: string;
};
type EventDeletionLogRow = { id: string; eventId: string; proposalId: string | null; ownerId: string | null; title: string; slug: string; actorType: string; actorId: string | null; deletedAt: string };

type SubscriptionRow = Record<string, unknown> & {
  id: string;
  email: string;
  plan: string;
  status: string;
  payment: string;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
};

type EventTransactionRow = {
  id: string;
  eventTitle: string;
  payerName: string | null;
  payerEmail: string | null;
  hostName: string | null;
  grossCents: number;
  platformFeeCents: number;
  processingFeeCents: number;
  customerFeeCents: number;
  hostNetCents: number;
  currency: string;
  status: string;
  stripeCheckoutSessionId: string | null;
  paidAt: string;
};

type AdminStripeBilling = {
  configured: boolean;
  totalPaidCents: number;
  recentPayments: Array<{
    id: string;
    customerId: string;
    customerName: string | null;
    customerEmail: string | null;
    number: string | null;
    description: string;
    amountPaid: number;
    currency: string;
    status: string;
    paidAt: string;
    hasDocument: boolean;
  }>;
};

type UserRow = Record<string, unknown> & {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  market: string;
  countryCode: string;
  stateCode: string;
  city: string;
  tier: string;
  tierOverride: string;
  subscriptionExempt: boolean;
  avatarVersion: number | null;
  profileImagePath: string | null;
  emailVerified: boolean;
  adminApproved: boolean;
  adminApprovalDenied: boolean;
  organization: string;
  bio: string;
  phone: string;
  websiteUrl: string;
  portfolioUrl: string;
  profileSlug: string;
  profileBio: string;
  experienceYears: number;
  height: string;
  measurements: string;
  hairColor: string;
  eyeColor: string;
  specialties: string[];
  xUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  onlyfansUrl: string;
  customUrl: string;
  isAvailable: boolean;
  isPublished: boolean;
  identityStatus: string;
  identityReviewNotes: string | null;
  hasIdentityDocument: boolean;
  identityDocumentType: string | null;
  identityLegalName: string | null;
  identityIssuingCountry: string | null;
  identityExpiresOn: string | null;
  identityHasBack: boolean;
  identityHasSelfie: boolean;
  lastActiveAt: string;
  accountDeletionScheduledAt: string | null;
  updatedAt: string;
};

type AdminMemberMessage = {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderUsername: string | null;
  senderProfileSlug: string | null;
  senderAvatarVersion: number | null;
  senderImagePath: string | null;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  recipientUsername: string | null;
  recipientProfileSlug: string | null;
  recipientAvatarVersion: number | null;
  recipientImagePath: string | null;
  recipientRole: string;
  messageKind: "initial" | "reply";
  subject: string;
  body: string;
  createdAt: string;
};

const adminMessagesPerPage = 50;

function AdminMemberAvatar({
  memberId,
  name,
  username,
  profileSlug,
  avatarVersion,
  role,
}: {
  memberId: string;
  name: string;
  username: string | null;
  profileSlug: string | null;
  avatarVersion: number | null;
  imagePath: string | null;
  role: string;
}) {
  const source = avatarVersion
    ? `/api/members/${memberId}/avatar?v=${avatarVersion}`
    : memberPlaceholder(role);
  const profileHref = profileSlug
    ? `/members/${profileSlug}`
    : username
      ? `/users/${username}`
      : null;
  const avatar = (
    <Image unoptimized src={source} alt={avatarVersion ? `${name} profile` : `${role} placeholder`} width={52} height={52} />
  );

  if (!profileHref) {
    return <span className="admin-message-avatar">{avatar}</span>;
  }

  return (
    <Link
      className="admin-message-avatar"
      href={profileHref}
      aria-label={`Open ${name}'s profile`}
      title={`Open ${name}'s profile`}
    >
      {avatar}
    </Link>
  );
}

function AdminUserAvatar({ user }: { user: UserRow }) {
  const source = user.avatarVersion
    ? `/api/members/${user.id}/avatar?v=${user.avatarVersion}`
    : memberPlaceholder(user.role);
  return (
    <span className="admin-user-avatar">
      <Image unoptimized src={source} alt={user.avatarVersion ? `${user.name} profile` : `${user.role} placeholder`} width={44} height={44} />
      {user.identityStatus === "approved" && <i className="verified-image-badge" aria-label="Identity verified">✓</i>}
    </span>
  );
}

type EventRow = Record<string, unknown> & {
  id: string;
  slug: string;
  title: string;
  category: string;
  location: string;
  countryCode: string;
  stateCode: string;
  city: string;
  summary: string;
  description: string;
  imagePath: string;
  mediaType: "image" | "video";
  hasMedia: boolean;
  hasPoster: boolean;
  startsAt: string;
  endsAt: string | null;
  venue: string;
  externalEventUrl: string;
  redirectToExternal: boolean;
  costDollars: number;
  refundDaysBefore: number;
  refundTerms: string;
  noRefunds: boolean;
  passportRequired: boolean;
  travelDetails?: EventTravelDetails;
  airportInfo?: string;
  flightInstructions?: string;
  shootTypes: string[];
  participationPaths: ParticipationPathInput[];
  capacity: number;
  spotsRemaining: number;
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
  isFeatured: boolean;
  isPublished: boolean;
  updatedAt: string;
};

type SponsorRow = {
  id: string;
  name: string;
  category: string;
  logoPath: string | null;
  websiteUrl: string | null;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  description: string;
  location: string;
  sponsorLevel: string;
  preferredPlacement: string;
  preferredLogoSize: string;
  brandGuidelines: string;
  logoUsageApproved: boolean;
  sponsorshipStartsOn: string | null;
  sponsorshipEndsOn: string | null;
  requiredWording: string;
  trackingUrl: string | null;
  active: boolean;
};

type SponsorshipRequestRow = {
  id: string;
  eventTitle: string;
  sponsorName: string;
  direction: string;
  status: string;
  message: string;
  targetName: string | null;
  cashAmountCents: number;
  flightIncluded: boolean;
  hotelIncluded: boolean;
  representationRequired: boolean;
  createdAt: string;
};

type SystemStatus = {
  database: boolean;
  stripeSecret: boolean;
  stripePublishable: boolean;
  stripeWebhook: boolean;
  stripeCreatorPrice: boolean;
  stripeProPrice: boolean;
  smtp: boolean;
  documentEncryption: boolean;
  metaAppId: boolean;
  metaAppSecret: boolean;
  metaRedirectUri: boolean;
  instagramAccess: boolean;
};

type IdentityAuditRow = {
  id: string;
  memberName: string;
  action: string;
  detail: string;
  createdAt: string;
};

const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function money(cents: number) {
  return usd.format(cents / 100);
}

const proposalColumns: TableColumn<ProposalRow>[] = [
  {
    key: "event",
    header: "Event",
    width: proportional(1.5),
    renderCell: (row) => (
      <div className="astryx-table-primary">
        <strong>{row.title}</strong>
        <small>
          {row.type} · {row.location}
        </small>
      </div>
    ),
  },
  {
    key: "lead",
    header: "Lead",
    width: proportional(1.2),
    renderCell: (row) => (
      <div className="astryx-table-primary">
        <strong>{row.lead}</strong>
        <small>
          {row.role} · {row.email}
        </small>
      </div>
    ),
  },
  {
    key: "budget",
    header: "Budget",
    width: proportional(1),
    renderCell: (row) => (
      <div className="astryx-table-primary">
        <strong>{row.budget}</strong>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: proportional(0.7),
    renderCell: (row) => (
      <Badge
        label={row.status}
        variant={row.status === "approved" ? "success" : "pink"}
      />
    ),
  },
  {
    key: "action",
    header: "",
    width: proportional(0.8),
    renderCell: (row) => <ProposalActions proposalId={row.id} status={row.status} />,
  },
];

function ProposalActions({ proposalId, status }: { proposalId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function approve() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/proposals/${proposalId}/approve`, {
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not approve.");
      setSaving(false);
      return;
    }
    router.refresh();
  }
  async function reject() {
    if (!reason.trim()) return setError("Enter a reason for the host.");
    setSaving(true);
    const response = await fetch(`/api/admin/proposals/${proposalId}/reject`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error ?? "Could not reject proposal.");
    setRejecting(false);
    router.refresh();
  }
  async function removeRejected() {
    setSaving(true);
    const response = await fetch(`/api/admin/proposals/${proposalId}`, { method: "DELETE" });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error ?? "Could not delete rejected proposal.");
    setConfirmingDelete(false);
    router.refresh();
  }

  return (
    <div className="proposal-approval">
      <Link href={`/admin/proposals/${proposalId}`} target="_blank">Preview ↗</Link>
      {status === "approved" ? <span>Published</span> : status === "deleted" ? <span>Deleted event</span> : ["rejected", "declined"].includes(status) ? <button type="button" className="proposal-reject-button" onClick={() => setConfirmingDelete(true)}>Delete</button> : <>
        <button type="button" onClick={approve} disabled={saving}>{saving ? "Saving…" : "Approve + publish"}</button>
        <button type="button" className="proposal-reject-button" onClick={() => setRejecting(true)} disabled={saving}>Reject</button>
      </>}
      {rejecting && <div className="delete-confirmation-backdrop"><section className="delete-confirmation proposal-rejection-dialog" role="dialog" aria-modal="true"><p className="astryx-kicker">REJECT PROPOSAL</p><h2>Tell the host why.</h2><textarea rows={5} maxLength={1200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required rejection reason" autoFocus /><div><button type="button" onClick={() => setRejecting(false)}>Cancel</button><button type="button" onClick={reject} disabled={saving}>Reject proposal</button></div></section></div>}
      {confirmingDelete && <div className="delete-confirmation-backdrop"><section className="delete-confirmation" role="alertdialog" aria-modal="true"><p className="astryx-kicker">DELETE REJECTED PROPOSAL</p><h2>Remove this proposal?</h2><p>This permanently removes the rejected proposal and its uploaded proposal media.</p><div><button type="button" onClick={() => setConfirmingDelete(false)}>Cancel</button><button type="button" onClick={removeRejected} disabled={saving}>{saving ? "Deleting…" : "Delete proposal"}</button></div></section></div>}
      {error && <small>{error}</small>}
    </div>
  );
}

const subscriptionColumns: TableColumn<SubscriptionRow>[] = [
  {
    key: "member",
    header: "Member",
    width: proportional(1.5),
    renderCell: (row) => (
      <div className="astryx-table-primary">
        <strong>{row.email}</strong>
        <small>Started {date.format(new Date(row.createdAt))}</small>
      </div>
    ),
  },
  {
    key: "plan",
    header: "Plan",
    width: proportional(0.8),
    renderCell: (row) => <Badge label={row.plan} variant="pink" />,
  },
  {
    key: "status",
    header: "Subscription",
    width: proportional(1),
    renderCell: (row) => (
      <span className="stripe-status-cell" tabIndex={0}>
        <Badge
          label={row.status}
          variant={
            row.status === "active" || row.status === "trialing"
              ? "success"
              : row.status === "past_due"
                ? "warning"
                : "neutral"
          }
        />
        <small>Stripe status: {row.status.replaceAll("_", " ")}</small>
      </span>
    ),
  },
  {
    key: "payment",
    header: "Last payment",
    width: proportional(0.8),
    renderCell: (row) => (
      <Badge
        label={row.payment}
        variant={row.payment === "paid" ? "success" : "warning"}
      />
    ),
  },
  {
    key: "renewal",
    header: "Period end",
    width: proportional(1),
    renderCell: (row) =>
      row.renewsAt
        ? `${date.format(new Date(row.renewsAt))}${row.cancelAtPeriodEnd ? " · cancels" : ""}`
        : <span className="subscription-period-pending">Pending</span>,
  },
];

function VerificationActions({ user }: { user: UserRow }) {
  const router = useRouter();
  const [notes, setNotes] = useState(user.identityReviewNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function decide(action: "approve" | "reject") {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/users/${user.id}/verification`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, notes }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not update verification.");
      setSaving(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="admin-verification-actions">
      <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Review notes for rejection" />
      <div>
        <button className="admin-verify-user-button" type="button" disabled={saving} onClick={() => decide("approve")}>
          {saving ? "Verifying…" : "Verify User"}
        </button>
        <button type="button" disabled={saving} onClick={() => decide("reject")}>Reject</button>
      </div>
      {error && <small>{error}</small>}
    </div>
  );
}

function AccountApprovalActions({ user }: { user: UserRow }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"approve" | "deny" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function confirmDecision() {
    if (!pendingAction) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/users/${user.id}/approval`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: pendingAction }),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.assign("/admin/login?expired=1");
      return;
    }
    if (!response.ok) {
      setError(result.error ?? "Could not save the account decision.");
      setSaving(false);
      return;
    }
    setPendingAction(null);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="admin-account-approval-actions">
      <div>
        <button className="approve" type="button" onClick={() => setPendingAction("approve")}>Approve</button>
        <button className="deny" type="button" onClick={() => setPendingAction("deny")}>Deny</button>
      </div>
      {error && <small role="alert">{error}</small>}
      {pendingAction && createPortal(
        <div className="admin-approval-confirm-backdrop" onMouseDown={() => !saving && setPendingAction(null)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby={`account-${pendingAction}-title`} onMouseDown={(event) => event.stopPropagation()}>
            <p className="astryx-kicker">ACCOUNT {pendingAction === "approve" ? "APPROVAL" : "DENIAL"}</p>
            <h2 id={`account-${pendingAction}-title`}>
              {pendingAction === "approve" ? "Approve" : "Deny"} {user.name}?
            </h2>
            <p>{pendingAction === "approve"
              ? "This activates the account after email verification and allows the member to sign in."
              : "This blocks the member from signing in. Their account remains stored so an administrator can review or approve it later."}</p>
            <div>
              <button type="button" disabled={saving} onClick={() => setPendingAction(null)}>Cancel</button>
              <button className={pendingAction} type="button" disabled={saving} onClick={confirmDecision}>
                {saving ? "Saving…" : pendingAction === "approve" ? "Yes, approve account" : "Yes, deny account"}
              </button>
            </div>
          </section>
        </div>, document.body,
      )}
    </div>
  );
}

export default function AdminWorkspace({
  adminUsername = "admin",
  events,
  users,
  proposals,
  eventDeletionLogs,
  subscriptions,
  sponsors,
  sponsorshipRequests,
  identityAuditLogs,
  systemStatus,
  heroSlides,
  eventTransactions,
  memberMessages,
  mediaItems,
  ratings,
  stripeBilling,
  sitePages,
  siteBranding,
}: {
  adminUsername?: string;
  events: EventRow[];
  users: UserRow[];
  proposals: ProposalRow[];
  eventDeletionLogs: EventDeletionLogRow[];
  subscriptions: SubscriptionRow[];
  sponsors: SponsorRow[];
  sponsorshipRequests: SponsorshipRequestRow[];
  identityAuditLogs: IdentityAuditRow[];
  systemStatus: SystemStatus;
  heroSlides: Array<AdminHeroSlide & { updatedAt: string }>;
  eventTransactions: EventTransactionRow[];
  memberMessages: AdminMemberMessage[];
  mediaItems: AdminMediaItem[];
  ratings: AdminRatingRow[];
  stripeBilling: AdminStripeBilling;
  sitePages: AdminPageSetting[];
  siteBranding: SiteBranding;
}) {
  const workspaceRouter = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [editor, setEditor] = useState<
    { kind: "user"; record: UserRow | null } |
    { kind: "event"; record: EventRow | null } |
    null
  >(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [messagePage, setMessagePage] = useState(1);
  const [messageSearch, setMessageSearch] = useState("");
  const [messageFrom, setMessageFrom] = useState("all");
  const [messageTo, setMessageTo] = useState("all");
  const [messageRole, setMessageRole] = useState("all");
  const [messageAvatarFilter, setMessageAvatarFilter] = useState("all");
  const [messageKindFilter, setMessageKindFilter] = useState("all");
  const [messageSort, setMessageSort] = useState<"newest" | "oldest">("newest");
  const [billingTab, setBillingTab] = useState<"overview" | "memberships" | "payments" | "events">("overview");
  const [userSection, setUserSection] = useState<"directory" | "audit">("directory");
  const [systemSection, setSystemSection] = useState<"health" | "backups">("health");
  const [selectedMessageKeys, setSelectedMessageKeys] = useState<string[]>([]);
  const [saveNotice, setSaveNotice] = useState("");
  const [saveNoticeKind, setSaveNoticeKind] = useState<"success" | "error">("success");
  const [deletedUserIds, setDeletedUserIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirmingBatchDelete, setConfirmingBatchDelete] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchDeleteCode, setBatchDeleteCode] = useState("");
  const [identityPreview, setIdentityPreview] = useState<{ src: string; label: string } | null>(null);
  const [activeTab, setActiveTabState] = useState<AdminSection>("overview");
  const [sectionSearch, setSectionSearch] = useState("");
  const currentSection = adminSections.find((section) => section.id === activeTab)!;
  function setActiveTab(tab: AdminSection) {
    setActiveTabState(tab);
    setSectionSearch("");
    if (window.location.hash !== `#${tab}`) window.history.pushState(null, "", `#${tab}`);
  }
  useEffect(() => {
    const syncSection = () => {
      const saved = window.location.hash.slice(1);
      setActiveTabState(adminSections.find((section) => section.id === saved)?.id ?? "overview");
    };
    syncSection();
    window.addEventListener("popstate", syncSection);
    window.addEventListener("hashchange", syncSection);
    return () => { window.removeEventListener("popstate", syncSection); window.removeEventListener("hashchange", syncSection); };
  }, []);
  const [proposalTab, setProposalTab] = useState<"approved" | "pending" | "rejected" | "deleted">("pending");
  const visibleProposals = proposals.filter((proposal) =>
    proposalTab === "approved" ? proposal.status === "approved" :
    proposalTab === "pending" ? ["submitted", "reviewing"].includes(proposal.status) :
    proposalTab === "rejected" ? ["rejected", "declined"].includes(proposal.status) :
    proposal.status === "deleted",
  );
  const messageParticipants = useMemo(() => {
    const people = new Map<string, string>();
    for (const message of memberMessages) {
      people.set(message.senderId, message.senderName);
      people.set(message.recipientId, message.recipientName);
    }
    return [...people.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [memberMessages]);
  const filteredMessages = useMemo(() => {
    const search = messageSearch.trim().toLowerCase();
    return memberMessages
      .filter((message) => {
        const senderHasImage = Boolean(message.senderAvatarVersion || message.senderImagePath);
        const recipientHasImage = Boolean(message.recipientAvatarVersion || message.recipientImagePath);
        return (
          (!search || `${message.senderName} ${message.recipientName} ${message.subject} ${message.body}`.toLowerCase().includes(search)) &&
          (messageFrom === "all" || message.senderId === messageFrom) &&
          (messageTo === "all" || message.recipientId === messageTo) &&
          (messageRole === "all" || message.senderRole === messageRole || message.recipientRole === messageRole) &&
          (messageKindFilter === "all" || message.messageKind === messageKindFilter) &&
          (messageAvatarFilter === "all" ||
            (messageAvatarFilter === "both" && senderHasImage && recipientHasImage) ||
            (messageAvatarFilter === "from" && senderHasImage) ||
            (messageAvatarFilter === "to" && recipientHasImage) ||
            (messageAvatarFilter === "missing" && (!senderHasImage || !recipientHasImage)))
        );
      })
      .sort((a, b) => messageSort === "newest"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [memberMessages, messageAvatarFilter, messageFrom, messageKindFilter, messageRole, messageSearch, messageSort, messageTo]);
  const messagePageCount = Math.max(1, Math.ceil(filteredMessages.length / adminMessagesPerPage));
  const currentMessagePage = Math.min(messagePage, messagePageCount);
  const visibleAdminMessages = filteredMessages.slice(
    (currentMessagePage - 1) * adminMessagesPerPage,
    currentMessagePage * adminMessagesPerPage,
  );
  const activeUsers = users.filter((user) => !deletedUserIds.includes(user.id));
  const filteredUsers = activeUsers.filter((user) => {
    const search = userSearch.trim().toLowerCase();
    return (
      (!search || `${user.name} ${user.username} ${user.email} ${user.market}`.toLowerCase().includes(search)) &&
      (roleFilter === "all" || user.role === roleFilter) &&
      (tierFilter === "all" || user.tier === tierFilter)
    );
  });
  const selectedUsers = activeUsers.filter((user) => selectedUserIds.includes(user.id));

  async function deleteSelectedUsers() {
    setBatchDeleting(true);
    const response = await fetch("/api/admin/users/batch", {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: selectedUserIds }),
    });
    const result = await response.json();
    setBatchDeleting(false);
    if (response.status === 401) {
      window.location.assign("/admin/login?expired=1");
      return;
    }
    const deletedIds: string[] = Array.isArray(result.deletedIds) ? result.deletedIds : [];
    if (deletedIds.length) setDeletedUserIds((current) => [...new Set([...current, ...deletedIds])]);
    setSelectedUserIds((current) => current.filter((id) => !deletedIds.includes(id)));
    setConfirmingBatchDelete(false);
    setBatchDeleteCode("");
    if (!response.ok && !deletedIds.length) {
      setSaveNoticeKind("error");
      setSaveNotice(result.error || "The selected accounts could not be deleted.");
      return;
    }
    const failedCount = Array.isArray(result.failedIds) ? result.failedIds.length : 0;
    setSaveNoticeKind(failedCount ? "error" : "success");
    setSaveNotice(failedCount
      ? `${deletedIds.length} account${deletedIds.length === 1 ? "" : "s"} deleted; ${failedCount} could not be deleted.`
      : `${deletedIds.length} user account${deletedIds.length === 1 ? "" : "s"} and associated data deleted successfully.`);
  }

  async function deleteMessages(messages: AdminMemberMessage[]) {
    if (!messages.length || !window.confirm(`Delete ${messages.length} selected message${messages.length === 1 ? "" : "s"}? Initial messages also remove their attached reply thread.`)) return;
    const response = await fetch("/api/admin/messages", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: messages.map((message) => ({ id: message.id, kind: message.messageKind })) }),
    });
    const result = await response.json();
    if (!response.ok) return setSaveNotice(result.error || "Messages could not be deleted.");
    setSelectedMessageKeys([]);
    setSaveNotice(`${result.deleted} communication record(s) deleted.`);
    window.location.reload();
  }

  return (
    <section className="astryx-admin-workspace">
      {saveNotice && <div className={`admin-save-notice ${saveNoticeKind === "error" ? "is-error" : ""}`} role={saveNoticeKind === "error" ? "alert" : "status"}>{saveNotice}</div>}
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" href="/" target="_blank" rel="noopener noreferrer"><span className="admin-brand-monogram">ME</span><span><b data-platform-short-name>{siteBranding.shortName}</b><small>Admin workspace</small></span></Link>
        <label className="admin-section-search">Find a section<input type="search" value={sectionSearch} onChange={(event) => setSectionSearch(event.target.value)} placeholder="Search navigation…" /></label>
        <nav className="admin-section-nav" aria-label="Admin sections">
          {["Workspace", "Manage", "Website", "Operations"].map((group) => {
            const sections = adminSections.filter((section) => section.group === group && `${section.label} ${section.description}`.toLowerCase().includes(sectionSearch.toLowerCase().trim()));
            return sections.length ? <div className="admin-nav-group" key={group}><span>{group}</span>{sections.map((section) => <button className={activeTab === section.id ? "is-active" : ""} type="button" key={section.id} aria-current={activeTab === section.id ? "page" : undefined} onClick={() => setActiveTab(section.id)} title={section.description}><AdminNavIcon name={section.id} /><span>{section.label}</span></button>)}</div> : null;
          })}
          {!adminSections.some((section) => `${section.label} ${section.description}`.toLowerCase().includes(sectionSearch.toLowerCase().trim())) && <p className="admin-nav-empty" role="status">No sections found. Try “users”, “images”, or “payments”.</p>}
        </nav>
        <label className="admin-mobile-section">Go to section<select value={activeTab} onChange={(event) => setActiveTab(event.target.value as AdminSection)}>{["Workspace", "Manage", "Website", "Operations"].map((group) => <optgroup label={group} key={group}>{adminSections.filter((section) => section.group === group).map((section) => <option value={section.id} key={section.id}>{section.label}</option>)}</optgroup>)}</select></label>
        <Link className="admin-view-website" href="/" target="_blank" rel="noopener noreferrer">View website ↗</Link>
        <div className="admin-sidebar-account"><span className="admin-account-initial">{adminUsername.slice(0, 1).toUpperCase()}</span><span><strong>{adminUsername}</strong><small>Administrator</small></span><form action="/api/admin/logout" method="post"><button type="submit" title="Sign out" aria-label="Sign out"><AdminNavIcon name="logout" /></button></form></div>
      </aside>
      <div className="admin-workspace-content" id="admin-content">
      <header className="admin-workspace-topbar"><div className="admin-breadcrumb"><button type="button" onClick={() => setActiveTab("overview")}>Workspace</button><span aria-hidden="true">/</span><strong>{currentSection.label}</strong></div><div className="admin-topbar-actions"><span className={`admin-connection-status${systemStatus.database ? "" : " is-warning"}`}><i aria-hidden="true" />{systemStatus.database ? "Database connected" : "Database needs attention"}</span><button className="admin-refresh" type="button" disabled={refreshing} onClick={() => startRefresh(() => workspaceRouter.refresh())}><AdminNavIcon name="refresh" /><span>{refreshing ? "Refreshing…" : "Refresh"}</span></button><form className="admin-mobile-signout" action="/api/admin/logout" method="post"><button type="submit" aria-label="Sign out"><AdminNavIcon name="logout" /></button></form></div></header>
      <header className="admin-section-intro"><p>{currentSection.group === "Workspace" ? "Your workspace" : currentSection.group}</p><h1>{currentSection.label}</h1><p>{currentSection.description}</p></header>
      {activeTab === "overview" && <div className="admin-summary-cards">
        <button type="button" onClick={() => setActiveTab("users")}><span>Members</span><strong>{activeUsers.length}</strong><small>Accounts in your community</small><b>Manage members →</b></button>
        <button type="button" onClick={() => setActiveTab("events")}><span>Events</span><strong>{events.length}</strong><small>{events.filter((event) => event.isPublished).length} published</small><b>Manage events →</b></button>
        <button type="button" onClick={() => setActiveTab("sponsors")}><span>Sponsors</span><strong>{sponsors.length}</strong><small>Brand and partnership profiles</small><b>View partnerships →</b></button>
        <button type="button" onClick={() => setActiveTab("billing")}><span>Active memberships</span><strong>{subscriptions.filter((item) => item.status === "active" || item.status === "trialing").length}</strong><small>Active or trial subscriptions</small><b>View billing →</b></button>
      </div>}
      {activeTab === "overview" && (
        <div className="admin-overview-dashboard">
          <section><p className="astryx-kicker">ACTION QUEUE</p><h2>What needs attention.</h2><div className="admin-overview-action-grid">
            <button type="button" onClick={() => setActiveTab("users")}><strong>{activeUsers.filter((user) => !user.adminApproved).length}</strong><span>accounts awaiting approval</span></button>
            <button type="button" onClick={() => setActiveTab("users")}><strong>{activeUsers.filter((user) => user.identityStatus === "pending").length}</strong><span>ID reviews pending</span></button>
            <button type="button" onClick={() => setActiveTab("messages")}><strong>{memberMessages.length}</strong><span>communications archived</span></button>
            <button type="button" onClick={() => setActiveTab("events")}><strong>{events.filter((event) => !event.isPublished).length}</strong><span>unpublished events</span></button>
          </div></section>
          <section className="admin-overview-recent"><div><p className="astryx-kicker">RECENT ACTIVITY</p><h3>Latest operational signals.</h3></div>
            <ul>
              <li><span>Event proposals</span><strong>{proposals.length}</strong></li>
              <li><span>Active memberships</span><strong>{subscriptions.filter((item) => item.status === "active" || item.status === "trialing").length}</strong></li>
              <li><span>Sponsorship requests</span><strong>{sponsorshipRequests.length}</strong></li>
              <li><span>Verified ratings</span><strong>{ratings.length}</strong></li>
            </ul>
          </section>
        </div>
      )}
      {activeTab === "stats" && <AdminActivityStats />}
      {activeTab === "pages" && <AdminPageManager initialPages={sitePages} mediaItems={mediaItems.filter((item) => item.kind === "image")} />}
      {activeTab === "branding" && <AdminBrandingManager initialSettings={siteBranding} mediaItems={mediaItems.filter((item) => item.kind === "image")} />}
      {activeTab === "homepage" && <AdminHeroManager key={heroSlides.map((slide) => `${slide.id}:${slide.updatedAt}`).join("|")} slides={heroSlides} />}
      {activeTab === "media" && <AdminMediaLibrary initialItems={mediaItems} />}
      {activeTab === "ratings" && <AdminRatingManager initialRatings={ratings} />}
      {activeTab === "users" && <>
      <nav className="admin-subtabs" aria-label="User sections">
        <button type="button" className={userSection === "directory" ? "is-active" : ""} onClick={() => setUserSection("directory")}>Users</button>
        <button type="button" className={userSection === "audit" ? "is-active" : ""} onClick={() => setUserSection("audit")}>Audit trail</button>
      </nav>
      {userSection === "directory" && <>
      <div className="admin-heading">
        <div>
          <p className="astryx-kicker">MEMBER OPERATIONS</p>
          <h2>System users</h2>
        </div>
        <div className="admin-heading-actions">
          <span className="admin-count">{filteredUsers.length} of {activeUsers.length} accounts</span>
          <button className="button" type="button" onClick={() => setEditor({ kind: "user", record: null })}>Add user +</button>
        </div>
      </div>
      <div className="admin-user-filters" aria-label="Filter system users">
        <label>Search<input type="search" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Name, email, or market" /></label>
        <label>User type<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All types</option><option value="model">Models</option><option value="photographer">Photographers</option><option value="host">Hosts</option><option value="sponsor">Sponsors</option></select></label>
        <label>Subscription<select value={tierFilter} onChange={(event) => setTierFilter(event.target.value)}><option value="all">All subscriptions</option><option value="diamond">Diamond</option><option value="platinum">Platinum</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="creator">Creator</option><option value="profile">Basic</option><option value="promoter_launch">Host Launch</option><option value="promoter_growth">Host Growth</option><option value="promoter_pro">Host Pro</option><option value="promoter_agency">Host Agency</option><option value="sponsor_silver">Sponsor Silver</option><option value="sponsor_gold">Sponsor Gold</option><option value="sponsor_platinum">Sponsor Platinum</option><option value="sponsor_diamond">Sponsor Diamond</option><option value="none">No subscription</option></select></label>
        {(userSearch || roleFilter !== "all" || tierFilter !== "all") && <button type="button" onClick={() => { setUserSearch(""); setRoleFilter("all"); setTierFilter("all"); }}>Clear filters</button>}
      </div>
      <div className="admin-management-table" role="region" aria-label="System users table. Scroll horizontally to see all columns." tabIndex={0}>
        {filteredUsers.length ? (
          <table>
            <thead><tr><th><input type="checkbox" aria-label="Select all visible users" checked={filteredUsers.length > 0 && filteredUsers.every((user) => selectedUserIds.includes(user.id))} onChange={(event) => setSelectedUserIds(event.target.checked ? [...new Set([...selectedUserIds, ...filteredUsers.map((user) => user.id)])] : selectedUserIds.filter((id) => !filteredUsers.some((user) => user.id === id)))} /></th><th>Member</th><th>ID image</th><th>Role</th><th>Tier</th><th>Verification</th><th>Last active</th><th /></tr></thead>
            <tbody>{filteredUsers.map((user) => (
              <tr key={user.id}>
                <td><input type="checkbox" aria-label={`Select ${user.name}`} checked={selectedUserIds.includes(user.id)} onChange={(event) => setSelectedUserIds((current) => event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id))} /></td>
                <td><div className="admin-user-identity"><AdminUserAvatar user={user} /><span><strong>{user.name}</strong><small>@{user.username} · {user.email}</small></span></div></td>
                <td>
                  {user.hasIdentityDocument ? (
                    <div className="admin-id-thumbnails">
                      <button type="button" onClick={() => setIdentityPreview({ src: `/api/admin/identity-documents/${user.id}/front`, label: `${user.name} ID front` })}>
                        <Image unoptimized src={`/api/admin/identity-documents/${user.id}/front`} alt={`${user.name} ID front`} width={92} height={60} />
                      </button>
                      {user.identityHasBack && <button type="button" onClick={() => setIdentityPreview({ src: `/api/admin/identity-documents/${user.id}/back`, label: `${user.name} ID back` })}><span>Back</span></button>}
                      {user.identityHasSelfie && <button type="button" onClick={() => setIdentityPreview({ src: `/api/admin/identity-documents/${user.id}/selfie`, label: `${user.name} verification selfie` })}><span>Selfie</span></button>}
                    </div>
                  ) : (
                    <div className="admin-id-placeholder" aria-label="No ID uploaded"><span>▧</span><small>No ID</small></div>
                  )}
                </td>
                <td><strong>{user.role}</strong><small>{user.market}</small></td>
                <td>
                  <div className="admin-user-subscription">
                    <Badge label={user.tier === "profile" ? "basic" : user.tier.replaceAll("_", " ")} variant={["gold", "platinum", "diamond"].some((tier) => user.tier.endsWith(tier)) ? "success" : ["creator", "silver"].some((tier) => user.tier.endsWith(tier)) ? "pink" : "neutral"} />
                    {user.subscriptionExempt && <span title="Recurring monthly or yearly payment is not required">✓ Payment exempt</span>}
                  </div>
                </td>
                <td>
                  {user.adminApproved
                    ? <Badge label="account approved" variant="success" />
                    : user.adminApprovalDenied
                      ? <Badge label="account denied" variant="warning" />
                      : <AccountApprovalActions user={user} />}
                  <small>{user.emailVerified ? "Account active · email verified" : "Account inactive · email pending"} · ID {user.identityStatus.replaceAll("_", " ")}</small>
                  {user.hasIdentityDocument && user.identityStatus !== "approved" && <VerificationActions user={user} />}
                  {user.identityStatus === "approved" && <span className="admin-id-approved">✓ Identity approved</span>}
                </td>
                <td>
                  <strong>{new Date(user.lastActiveAt).toLocaleString()}</strong>
                  <small>{user.accountDeletionScheduledAt ? `Deletion scheduled ${date.format(new Date(user.accountDeletionScheduledAt))}` : "Account active"}</small>
                </td>
                <td><button type="button" onClick={() => setEditor({ kind: "user", record: user })}>Edit</button></td>
              </tr>
            ))}</tbody>
          </table>
        ) : (
          <EmptyState title={activeUsers.length ? "No matching users" : "No member accounts"} description={activeUsers.length ? "Change or clear the current filters." : "Verified and pending signups will appear here."} />
        )}
      </div>
      {selectedUserIds.length > 0 && <aside className="admin-batch-floating">
        <strong>{selectedUserIds.length} selected</strong>
        <span>Bulk account actions</span>
        <button type="button" onClick={() => setConfirmingBatchDelete(true)}>Edit selection</button>
        <button type="button" onClick={() => setSelectedUserIds([])}>Clear</button>
      </aside>}
      {confirmingBatchDelete && createPortal(
        <div className="admin-delete-user-backdrop" onMouseDown={() => !batchDeleting && setConfirmingBatchDelete(false)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="batch-delete-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="astryx-kicker">BATCH ACCOUNT DELETION</p>
            <h2 id="batch-delete-title">Delete {selectedUsers.length} users?</h2>
            <p>This runs the same permanent account purge used for individual deletion, including subscriptions, profiles, events, files, reviews and private records. Existing message history retains each member’s display name.</p>
            <ul>{selectedUsers.slice(0, 8).map((user) => <li key={user.id}>{user.name} · {user.email}</li>)}{selectedUsers.length > 8 && <li>and {selectedUsers.length - 8} more…</li>}</ul>
            <label className="admin-delete-code">Enter deletion code <code>DELETE-{selectedUsers.length}</code><input value={batchDeleteCode} onChange={(event) => setBatchDeleteCode(event.target.value.toUpperCase())} placeholder={`DELETE-${selectedUsers.length}`} /></label>
            <div><button type="button" disabled={batchDeleting} onClick={() => { setConfirmingBatchDelete(false); setBatchDeleteCode(""); }}>Cancel</button><button type="button" disabled={batchDeleting || batchDeleteCode !== `DELETE-${selectedUsers.length}`} onClick={deleteSelectedUsers}>{batchDeleting ? "Deleting…" : "Delete selected permanently"}</button></div>
          </section>
        </div>, document.body)}
      {identityPreview && createPortal(
        <div className="admin-identity-lightbox" onMouseDown={(event) => event.target === event.currentTarget && setIdentityPreview(null)}>
          <section role="dialog" aria-modal="true" aria-label={identityPreview.label}>
            <header><strong>{identityPreview.label}</strong><button type="button" onClick={() => setIdentityPreview(null)}>×</button></header>
            <Image unoptimized src={identityPreview.src} alt={identityPreview.label} width={1400} height={900} />
          </section>
        </div>, document.body)}
      </>}
      {userSection === "audit" && <div className="admin-audit-log">
        <strong>User and identity audit trail</strong>
        {identityAuditLogs.length ? identityAuditLogs.map((log) => (
          <article key={log.id}>
            <div><b>{log.memberName}</b><span>{log.action.replaceAll("_", " ")}</span></div>
            <small>{new Date(log.createdAt).toLocaleString()}{log.detail ? ` · ${log.detail}` : ""}</small>
          </article>
        )) : <p>No user or private-document activity recorded yet.</p>}
      </div>}
      </>}

      {activeTab === "messages" && (
        <>
          <div className="admin-heading">
            <div><p className="astryx-kicker">MEMBER COMMUNICATIONS</p><h2>Conversation archive</h2></div>
            <span className="admin-count">{filteredMessages.length} of {memberMessages.length} messages</span>
          </div>
          <div className="admin-message-filters" aria-label="Filter member messages">
            <label>Search<input type="search" value={messageSearch} onChange={(event) => { setMessageSearch(event.target.value); setMessagePage(1); }} placeholder="Name, subject, or message" /></label>
            <label>From<select value={messageFrom} onChange={(event) => { setMessageFrom(event.target.value); setMessagePage(1); }}><option value="all">All senders</option>{messageParticipants.map(([id, name]) => <option key={`from-${id}`} value={id}>{name}</option>)}</select></label>
            <label>To<select value={messageTo} onChange={(event) => { setMessageTo(event.target.value); setMessagePage(1); }}><option value="all">All recipients</option>{messageParticipants.map(([id, name]) => <option key={`to-${id}`} value={id}>{name}</option>)}</select></label>
            <label>Role<select value={messageRole} onChange={(event) => { setMessageRole(event.target.value); setMessagePage(1); }}><option value="all">Any role</option><option value="model">Model</option><option value="photographer">Photographer</option><option value="host">Host</option><option value="sponsor">Sponsor</option></select></label>
            <label>Profile images<select value={messageAvatarFilter} onChange={(event) => { setMessageAvatarFilter(event.target.value); setMessagePage(1); }}><option value="all">Any</option><option value="both">Both users have images</option><option value="from">Sender has image</option><option value="to">Recipient has image</option><option value="missing">One or more missing</option></select></label>
            <label>Message type<select value={messageKindFilter} onChange={(event) => { setMessageKindFilter(event.target.value); setMessagePage(1); }}><option value="all">Initial and replies</option><option value="initial">Initial request</option><option value="reply">Reply</option></select></label>
            <label>Order<select value={messageSort} onChange={(event) => { setMessageSort(event.target.value as "newest" | "oldest"); setMessagePage(1); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
            <button type="button" onClick={() => { setMessageSearch(""); setMessageFrom("all"); setMessageTo("all"); setMessageRole("all"); setMessageAvatarFilter("all"); setMessageKindFilter("all"); setMessageSort("newest"); setMessagePage(1); }}>Clear filters</button>
          </div>
          <div className="admin-conversation-archive">
            {visibleAdminMessages.length > 0 && <div className="admin-message-bulkbar">
              <label><input type="checkbox" checked={visibleAdminMessages.every((message) => selectedMessageKeys.includes(`${message.messageKind}:${message.id}`))} onChange={(event) => {
                const pageKeys = visibleAdminMessages.map((message) => `${message.messageKind}:${message.id}`);
                setSelectedMessageKeys((current) => event.target.checked ? [...new Set([...current, ...pageKeys])] : current.filter((key) => !pageKeys.includes(key)));
              }} /> Select this page</label>
              {selectedMessageKeys.length > 0 && <button type="button" onClick={() => deleteMessages(memberMessages.filter((message) => selectedMessageKeys.includes(`${message.messageKind}:${message.id}`)))}>Delete selected ({selectedMessageKeys.length})</button>}
            </div>}
            {visibleAdminMessages.length ? visibleAdminMessages.map((message) => (
              <article className="admin-message-row" key={message.id}>
                <label className="admin-message-select"><input type="checkbox" aria-label={`Select message from ${message.senderName}`} checked={selectedMessageKeys.includes(`${message.messageKind}:${message.id}`)} onChange={(event) => {
                  const key = `${message.messageKind}:${message.id}`;
                  setSelectedMessageKeys((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key));
                }} /></label>
                <div className="admin-message-members" aria-label={`${message.senderName} sent a message to ${message.recipientName}`}>
                  <div>
                    <AdminMemberAvatar memberId={message.senderId} name={message.senderName} username={message.senderUsername} profileSlug={message.senderProfileSlug} avatarVersion={message.senderAvatarVersion} imagePath={message.senderImagePath} role={message.senderRole} />
                    <span><strong>{message.senderName}</strong><small>Sender</small></span>
                  </div>
                  <b aria-hidden="true">→</b>
                  <div>
                    <AdminMemberAvatar memberId={message.recipientId} name={message.recipientName} username={message.recipientUsername} profileSlug={message.recipientProfileSlug} avatarVersion={message.recipientAvatarVersion} imagePath={message.recipientImagePath} role={message.recipientRole} />
                    <span><strong>{message.recipientName}</strong><small>Recipient</small></span>
                  </div>
                </div>
                <div className="admin-message-copy">
                  <header><b>{message.subject}</b><span><small>{new Date(message.createdAt).toLocaleString()}</small><button type="button" aria-label={`Delete message from ${message.senderName}`} onClick={() => deleteMessages([message])}>Delete</button></span></header>
                  <p>{message.body}</p>
                </div>
              </article>
            )) : <EmptyState title="No member conversations" description="Accepted introductions and their replies will appear here." />}
          </div>
          <nav className="admin-message-pagination" aria-label="Member communication pages">
            <button type="button" disabled={currentMessagePage === 1} onClick={() => setMessagePage((page) => Math.max(1, page - 1))}>Previous</button>
            <span>Page {currentMessagePage} of {messagePageCount} · 50 messages per page</span>
            <button type="button" disabled={currentMessagePage === messagePageCount} onClick={() => setMessagePage((page) => Math.min(messagePageCount, page + 1))}>Next</button>
          </nav>
        </>
      )}

      {activeTab === "events" && <>
      <div className="admin-heading">
        <div>
          <p className="astryx-kicker">PUBLISHED EXPERIENCES</p>
          <h2>Current events</h2>
        </div>
        <div className="admin-heading-actions">
          <span className="admin-count">{events.length} events</span>
          <button className="button" type="button" onClick={() => setEditor({ kind: "event", record: null })}>Add event +</button>
        </div>
      </div>
      <div className="admin-management-table">
        {events.length ? (
          <table>
            <thead><tr><th>Event</th><th>Cost</th><th>Capacity</th><th>Visibility</th><th>Last updated</th><th /></tr></thead>
            <tbody>{events.map((event) => (
              <tr key={event.id}>
                <td><strong>{event.title}</strong><small>{event.category} · {event.location}</small></td>
                <td>${event.costDollars.toLocaleString()}</td>
                <td><strong>{event.spotsRemaining} available</strong><small>{event.capacity} total spots</small></td>
                <td><Badge label={event.isPublished ? "published" : "draft"} variant={event.isPublished ? "success" : "neutral"} /></td>
                <td>{date.format(new Date(event.updatedAt))}</td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => setEditor({ kind: "event", record: event })}>Edit</button>
                    <DeleteEventButton eventId={event.id} eventTitle={event.title} endpoint="admin" />
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : (
          <EmptyState title="No events" description="Add the first event to publish it across the platform." />
        )}
      </div>

      <div className="admin-heading">
        <div>
          <p className="astryx-kicker">EVENT OPERATIONS</p>
          <h2>Proposal queue</h2>
        </div>
        <Link className="button" href="/host/new">
          New test proposal ↗
        </Link>
      </div>
      <div className="astryx-table-card">
        <nav className="admin-subtabs" aria-label="Proposal queue statuses">
          {(["approved", "pending", "rejected", "deleted"] as const).map((tab) => <button key={tab} type="button" className={proposalTab === tab ? "is-active" : ""} onClick={() => setProposalTab(tab)}>{tab === "pending" ? "Pending Review" : tab}</button>)}
        </nav>
        {visibleProposals.length ? (
          <Table
            data={visibleProposals}
            columns={proposalColumns}
            density="balanced"
            dividers="rows"
            hasHover
            textOverflow="truncate"
          />
        ) : (
          <EmptyState
            title="No proposals yet"
            description="Submit the event wizard to populate this PostgreSQL-backed queue."
          />
        )}
      </div>
      {proposalTab === "deleted" && <section className="event-deletion-audit">
        <div className="admin-heading"><div><p className="astryx-kicker">PERMANENT AUDIT LOG</p><h2>Deleted events</h2></div><span className="admin-count">{eventDeletionLogs.length} records</span></div>
        {eventDeletionLogs.length ? <div className="admin-management-table"><table><thead><tr><th>Event</th><th>Deleted by</th><th>Deleted at</th><th>Original ID</th></tr></thead><tbody>{eventDeletionLogs.map((log) => <tr key={log.id}><td><strong>{log.title}</strong><small>/{log.slug}</small></td><td><strong>{log.actorType === "admin" ? "Administrator" : "Event owner"}</strong><small>{log.actorId ?? "Unknown actor"}</small></td><td>{date.format(new Date(log.deletedAt))}</td><td><small>{log.eventId}</small></td></tr>)}</tbody></table></div> : <EmptyState title="No deletion records" description="Deleted events will be permanently recorded here." />}
      </section>}
      </>}

      {activeTab === "billing" && <>
      <nav className="admin-billing-tabs" aria-label="Billing sections">
        {(["overview", "memberships", "payments", "events"] as const).map((tab) => (
          <button key={tab} type="button" className={billingTab === tab ? "is-active" : ""} onClick={() => setBillingTab(tab)}>
            {tab === "payments" ? "Recent payments" : tab}
          </button>
        ))}
      </nav>
      {billingTab === "overview" && <>
      <div className="admin-heading subscriptions-heading">
        <div><p className="astryx-kicker">BILLING OVERVIEW</p><h2>Revenue and payment activity</h2></div>
        <span className="admin-count">{stripeBilling.configured ? "Stripe test data connected" : "Stripe unavailable"}</span>
      </div>
      <div className="admin-transaction-summary">
        <article><span>Membership payments</span><strong>{money(stripeBilling.totalPaidCents)}</strong><small>All paid Stripe invoices</small></article>
        <article><span>Local event sales</span><strong>{money(eventTransactions.reduce((total, row) => total + row.grossCents, 0))}</strong></article>
        <article><span>Customer service fees</span><strong>{money(eventTransactions.reduce((total, row) => total + row.customerFeeCents, 0))}</strong><small>Combined service fee</small></article>
      </div>
      </>}
      {billingTab === "memberships" && <>
      <div className="admin-heading subscriptions-heading">
        <div>
          <p className="astryx-kicker">STRIPE BILLING</p>
          <h2>Monthly memberships</h2>
        </div>
        <Link className="quiet-dark-link" href="/membership">
          View pricing →
        </Link>
      </div>
      <div className="astryx-table-card">
        {subscriptions.length ? (
          <Table
            data={subscriptions}
            columns={subscriptionColumns}
            density="balanced"
            dividers="rows"
            hasHover
            textOverflow="truncate"
          />
        ) : (
          <EmptyState
            title="No monthly memberships"
            description="Completed Stripe Checkout sessions appear here after their signed webhooks are processed."
          />
        )}
      </div>
      </>}
      {billingTab === "payments" && <>
      <div className="admin-heading subscriptions-heading">
        <div><p className="astryx-kicker">RECENT STRIPE PAYMENTS</p><h2>10 most recent paid memberships</h2></div>
        <span className="admin-count">{stripeBilling.recentPayments.length} payments</span>
      </div>
      <div className="admin-management-table">
        {stripeBilling.recentPayments.length ? <table>
          <thead><tr><th>Member</th><th>Description</th><th>Amount</th><th>Status</th><th>Paid</th></tr></thead>
          <tbody>{stripeBilling.recentPayments.map((payment) => <tr key={payment.id}>
            <td><strong>{payment.customerName || "Stripe customer"}</strong><small>{payment.customerEmail || payment.customerId}</small></td>
            <td><strong>{payment.description}</strong><small>{payment.number ? `Invoice ${payment.number}` : payment.id}</small></td>
            <td>{new Intl.NumberFormat("en-US", { style: "currency", currency: payment.currency.toUpperCase() }).format(payment.amountPaid / 100)}</td>
            <td><Badge label={payment.status} variant={payment.status === "paid" ? "success" : "warning"} /></td>
            <td>{date.format(new Date(payment.paidAt))}</td>
          </tr>)}</tbody>
        </table> : <EmptyState title="No Stripe payments" description={stripeBilling.configured ? "Paid membership invoices will appear here." : "Configure the Stripe test secret key to load payment history."} />}
      </div>
      </>}
      {billingTab === "events" && <>
      <div className="admin-transaction-summary">
        <article><span>Local event sales</span><strong>{money(eventTransactions.reduce((total, row) => total + row.grossCents, 0))}</strong></article>
        <article><span>Customer service fees</span><strong>{money(eventTransactions.reduce((total, row) => total + row.customerFeeCents, 0))}</strong><small>Combined service fee</small></article>
        <article><span>Host net</span><strong>{money(eventTransactions.reduce((total, row) => total + row.hostNetCents, 0))}</strong></article>
      </div>
      <div className="admin-heading subscriptions-heading">
        <div><p className="astryx-kicker">EVENT TRANSACTIONS</p><h2>Local checkout ledger</h2></div>
        <span className="admin-count">{eventTransactions.length} payments</span>
      </div>
      <div className="admin-management-table">
        {eventTransactions.length ? (
          <table>
            <thead><tr><th>Event and payer</th><th>Customer total</th><th>Booking fee</th><th>Host proceeds</th><th>Status</th><th>Paid</th></tr></thead>
            <tbody>{eventTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td><strong>{transaction.eventTitle}</strong><small>{transaction.payerName ?? "Deleted member"} · {transaction.payerEmail ?? "No email"} · host {transaction.hostName ?? "Unknown"}</small></td>
                <td>{money(transaction.grossCents)}</td>
                <td><strong>{money(transaction.customerFeeCents)}</strong><small>Service fee</small></td>
                <td>{money(transaction.hostNetCents)}</td>
                <td><Badge label={transaction.status} variant={transaction.status === "paid" ? "success" : "warning"} /></td>
                <td>{date.format(new Date(transaction.paidAt))}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <EmptyState title="No local event transactions" description="Paid local event checkouts will show gross sales, the admin cut, and host net here." />}
      </div>
      </>}
      </>}

      {activeTab === "sponsors" && (
        <>
          <div className="admin-heading">
            <div><p className="astryx-kicker">PARTNERSHIPS</p><h2>Sponsors and requests</h2></div>
            <span className="admin-count">{sponsors.length} active sponsors</span>
          </div>
          <div className="admin-management-table">
            <table>
              <thead><tr><th>Sponsor</th><th>Category</th><th>Contact</th><th>Membership level</th><th>Status</th></tr></thead>
              <tbody>{sponsors.map((sponsor) => (
                <tr className="admin-sponsor-row" key={sponsor.id}>
                  <td>
                    <div className="admin-sponsor-name" tabIndex={0}>
                      {sponsor.logoPath
                        ? <Image unoptimized src={sponsor.logoPath} alt={`${sponsor.name} logo`} width={54} height={38} />
                        : <span>{sponsor.name.slice(0, 1)}</span>}
                      <strong>{sponsor.name}</strong>
                      <aside className="admin-sponsor-hover-card" aria-label={`${sponsor.name} contact information`}>
                        <header>
                          {sponsor.logoPath && <Image unoptimized src={sponsor.logoPath} alt="" width={96} height={54} />}
                          <div><strong>{sponsor.name}</strong><span>{sponsor.sponsorLevel} sponsor · {sponsor.category}</span></div>
                        </header>
                        {sponsor.description && <p>{sponsor.description}</p>}
                        <dl>
                          <div><dt>Contact</dt><dd>{sponsor.contactName || "Not provided"}</dd></div>
                          <div><dt>Email</dt><dd><a href={`mailto:${sponsor.contactEmail}`}>{sponsor.contactEmail}</a></dd></div>
                          <div><dt>Phone</dt><dd>{sponsor.contactPhone || "Not provided"}</dd></div>
                          <div><dt>Location</dt><dd>{sponsor.location || "Not provided"}</dd></div>
                          <div><dt>Placement</dt><dd>{sponsor.preferredPlacement || "Flexible"}</dd></div>
                          <div><dt>Logo size</dt><dd>{sponsor.preferredLogoSize || "Not specified"}</dd></div>
                          <div><dt>Term</dt><dd>{sponsor.sponsorshipStartsOn || "Open"} – {sponsor.sponsorshipEndsOn || "Open"}</dd></div>
                          <div><dt>Logo approval</dt><dd>{sponsor.logoUsageApproved ? "Written approval recorded" : "Approval required"}</dd></div>
                        </dl>
                        {sponsor.brandGuidelines && <p><b>Brand guidelines:</b> {sponsor.brandGuidelines}</p>}
                        {sponsor.requiredWording && <p><b>Required wording:</b> {sponsor.requiredWording}</p>}
                        <footer>
                          {sponsor.websiteUrl && <a href={sponsor.websiteUrl} target="_blank" rel="noreferrer">Website ↗</a>}
                          {sponsor.trackingUrl && <a href={sponsor.trackingUrl} target="_blank" rel="noreferrer">Tracking link ↗</a>}
                        </footer>
                      </aside>
                    </div>
                  </td>
                  <td>{sponsor.category}<small>{sponsor.sponsorLevel}</small></td>
                  <td>{sponsor.contactEmail}<small>{sponsor.contactName || "Contact not provided"}</small></td>
                  <td><AdminSponsorTierControl sponsorId={sponsor.id} currentLevel={sponsor.sponsorLevel} /></td>
                  <td><Badge label={sponsor.active ? "active" : "inactive"} variant={sponsor.active ? "success" : "neutral"} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="admin-sponsor-requests">
            <h3>Sponsorship request queue</h3>
            {sponsorshipRequests.length ? sponsorshipRequests.map((request) => (
              <article key={request.id}>
                <div><strong>{request.sponsorName} · {request.eventTitle}</strong><span>{request.direction.replaceAll("_", " ")}{request.targetName ? ` · for ${request.targetName}` : ""} · {date.format(new Date(request.createdAt))}</span><p>{request.message}</p><div className="sponsorship-package-pills">{request.flightIncluded && <span>✈ Flight</span>}{request.hotelIncluded && <span>▣ Hotel</span>}{request.cashAmountCents > 0 && <span>{money(request.cashAmountCents)} cash</span>}{request.representationRequired && <span>Representation</span>}</div></div>
                <span className={`sponsor-request-status status-${request.status}`}>
                  {request.status}
                </span>
              </article>
            )) : <p>No sponsorship requests yet.</p>}
          </div>
        </>
      )}

      {activeTab === "system" && (
        <>
          <div className="admin-heading"><div><p className="astryx-kicker">INFRASTRUCTURE</p><h2>Server health and API settings</h2></div></div>
          <nav className="admin-subtabs" aria-label="System sections">
            <button type="button" className={systemSection === "health" ? "is-active" : ""} onClick={() => setSystemSection("health")}>Health and APIs</button>
            <button type="button" className={systemSection === "backups" ? "is-active" : ""} onClick={() => setSystemSection("backups")}>SQL backups</button>
          </nav>
          {systemSection === "health" && <>
          <AdminSystemMonitor />
          <div className="admin-system-grid">
            <SystemCard label="Application API" configured detail="/api/health is available" />
            <SystemCard label="PostgreSQL" configured={systemStatus.database} detail="Primary application database" />
            <SystemCard label="Email / SMTP" configured={systemStatus.smtp} detail="Verification email transport" />
            <SystemCard label="Private ID encryption" configured={systemStatus.documentEncryption} detail="AES-256-GCM at application level" />
            <SystemCard label="Account lifecycle worker" configured detail="6-month reminder · 1-year warning · 14-day deletion" />
            <SystemCard label="Stripe secret key" configured={systemStatus.stripeSecret} detail="STRIPE_SECRET_KEY" />
            <SystemCard label="Stripe publishable key" configured={systemStatus.stripePublishable} detail="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" />
            <SystemCard label="Stripe webhook signing" configured={systemStatus.stripeWebhook} detail="STRIPE_WEBHOOK_SECRET" />
            <SystemCard label="Creator price" configured={systemStatus.stripeCreatorPrice} detail="STRIPE_CREATOR_PRICE_ID" />
            <SystemCard label="Pro price" configured={systemStatus.stripeProPrice} detail="STRIPE_PRO_PRICE_ID" />
            <SystemCard label="Meta application ID" configured={systemStatus.metaAppId} detail="META_APP_ID" />
            <SystemCard label="Meta application secret" configured={systemStatus.metaAppSecret} detail="META_APP_SECRET" />
            <SystemCard label="Meta OAuth callback" configured={systemStatus.metaRedirectUri} detail="META_OAUTH_REDIRECT_URI" />
            <SystemCard label="Instagram API access" configured={systemStatus.instagramAccess} detail="INSTAGRAM_ACCESS_TOKEN" />
          </div>
          <div className="admin-api-guidance">
            <strong>Payment and social API credentials</strong>
            <p>Secrets remain server-side and are never rendered back into the browser. Add Stripe test keys and Meta OAuth credentials to the protected environment configuration, then rebuild the application. This panel verifies each required value without exposing it.</p>
            <div className="admin-credential-groups">
              <section><b>Stripe Payment Element</b><code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code><code>STRIPE_SECRET_KEY</code><code>STRIPE_WEBHOOK_SECRET</code><span>Use test-mode keys locally.</span></section>
              <section><b>Meta OAuth / Instagram</b><code>META_APP_ID</code><code>META_APP_SECRET</code><code>META_OAUTH_REDIRECT_URI</code><code>INSTAGRAM_ACCESS_TOKEN</code><span>Instagram tiled feeds require approved API permissions.</span></section>
            </div>
          </div>
          </>}
          {systemSection === "backups" && <AdminDatabaseBackup />}
        </>
      )}
      <p className="admin-security-note">This local admin workspace is protected by a separate PostgreSQL-backed admin account and session.</p>
      {editor && <AdminRecordEditor
        editor={editor}
        memberMessages={memberMessages}
        onClose={() => setEditor(null)}
        onSaved={() => {
          setEditor(null);
          setSaveNotice(`${editor.kind === "user" ? "User" : "Event"} information saved.`);
        }}
        onDeleted={(deletedId) => {
          setDeletedUserIds((current) => [...new Set([...current, deletedId])]);
          setEditor(null);
          setSaveNoticeKind("success");
          setSaveNotice("User account and associated data deleted. Existing conversations were preserved.");
        }}
      />}
      </div>
    </section>
  );
}

function SystemCard({
  label,
  configured,
  detail,
}: {
  label: string;
  configured: boolean;
  detail: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <Badge label={configured ? "configured" : "missing"} variant={configured ? "success" : "warning"} />
      <small>{detail}</small>
    </article>
  );
}

function localDateTime(iso: string | null) {
  if (!iso) return "";
  const value = new Date(iso);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function AdminRecordEditor({
  editor,
  memberMessages,
  onClose,
  onSaved,
  onDeleted,
}: {
  editor: { kind: "user"; record: UserRow | null } | { kind: "event"; record: EventRow | null };
  memberMessages: AdminMemberMessage[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: (deletedId: string) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newEventMedia, setNewEventMedia] = useState<PreparedEventMedia | null>(null);
  const [confirmingUserDelete, setConfirmingUserDelete] = useState(false);

  async function deleteUser() {
    if (editor.kind !== "user" || !editor.record) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/users/${editor.record.id}`, { method: "DELETE", credentials: "same-origin", cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "The user could not be deleted.");
      setSaving(false);
      setConfirmingUserDelete(false);
      return;
    }
    onDeleted(editor.record.id);
    router.refresh();
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(formEvent.currentTarget);
    const isUser = editor.kind === "user";
    const payload = isUser
      ? {
          name: String(data.get("name") ?? ""),
          username: String(data.get("username") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
          role: String(data.get("role") ?? ""),
          market: String(data.get("market") ?? ""),
          countryCode: String(data.get("countryCode") ?? ""),
          stateCode: String(data.get("stateCode") ?? ""),
          city: String(data.get("city") ?? ""),
          tier: String(data.get("tier") ?? ""),
          subscriptionExempt: data.has("subscriptionExempt"),
          verified: data.has("verified"),
          approved: data.has("approved"),
          organization: String(data.get("organization") ?? ""),
          bio: String(data.get("bio") ?? ""),
          phone: String(data.get("phone") ?? ""),
          websiteUrl: String(data.get("websiteUrl") ?? ""),
          portfolioUrl: String(data.get("portfolioUrl") ?? ""),
          profileBio: String(data.get("profileBio") ?? ""),
          experienceYears: Number(data.get("experienceYears") ?? 0),
          height: String(data.get("height") ?? ""),
          measurements: String(data.get("measurements") ?? ""),
          hairColor: String(data.get("hairColor") ?? ""),
          eyeColor: String(data.get("eyeColor") ?? ""),
          specialties: String(data.get("specialties") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
          xUrl: String(data.get("xUrl") ?? ""),
          instagramUrl: String(data.get("instagramUrl") ?? ""),
          youtubeUrl: String(data.get("youtubeUrl") ?? ""),
          onlyfansUrl: String(data.get("onlyfansUrl") ?? ""),
          customUrl: String(data.get("customUrl") ?? ""),
          isAvailable: data.has("isAvailable"),
          isPublished: data.has("isPublished"),
        }
      : {
          title: String(data.get("title") ?? ""),
          category: String(data.get("category") ?? ""),
          location: String(data.get("location") ?? ""),
          countryCode: String(data.get("countryCode") ?? ""),
          stateCode: String(data.get("stateCode") ?? ""),
          city: String(data.get("city") ?? ""),
          venue: String(data.get("venue") ?? ""),
          summary: String(data.get("summary") ?? ""),
          description: String(data.get("description") ?? ""),
          imagePath: String(data.get("imagePath") ?? ""),
          startsAt: new Date(String(data.get("startsAt") ?? "")).toISOString(),
          endsAt: data.get("endsAt") ? new Date(String(data.get("endsAt"))).toISOString() : null,
          costDollars: Number(data.get("costDollars")),
          refundDaysBefore: Number(data.get("refundDaysBefore")),
          refundTerms: String(data.get("refundTerms") ?? ""),
          noRefunds: data.has("noRefunds"),
          passportRequired: data.has("passportRequired"),
          travelDetails: travelFromForm(data),
          airportInfo: String(data.get("airportInfo") ?? ""),
          flightInstructions: String(data.get("flightInstructions") ?? ""),
          shootTypes: data.getAll("shootTypes").map(String),
          externalEventUrl: String(data.get("externalEventUrl") ?? ""),
          redirectToExternal: data.has("redirectToExternal"),
          participationPaths: JSON.parse(
            String(data.get("participationPaths") ?? "[]"),
          ),
          capacity: Number(data.get("capacity")),
          spotsRemaining: Number(data.get("spotsRemaining")),
          included: String(data.get("included") ?? "").split("\n"),
          hotelAvailable: event?.hotelAvailable ?? false,
          hotelPriceDollars: (event?.hotelPriceCents ?? 0) / 100,
          hotelModelsAllowed: event?.hotelModelsAllowed ?? true,
          hotelPhotographersAllowed: event?.hotelPhotographersAllowed ?? false,
          villaAvailable: event?.villaAvailable ?? false,
          villaModelPriceDollars: (event?.villaModelPriceCents ?? 0) / 100,
          villaPhotographerPriceDollars: (event?.villaPhotographerPriceCents ?? 0) / 100,
          villaModelSpots: event?.villaModelSpots ?? 0,
          villaPhotographerSpots: event?.villaPhotographerSpots ?? 0,
          villaModelsAllowed: event?.villaModelsAllowed ?? true,
          villaPhotographersAllowed: event?.villaPhotographersAllowed ?? false,
          isFeatured: data.has("isFeatured"),
          isPublished: data.has("isPublished"),
        };
    const record = editor.record;
    const endpoint = record
      ? `/api/admin/${isUser ? "users" : "events"}/${record.id}`
      : `/api/admin/${isUser ? "users" : "events"}`;

    try {
      const response = await fetch(endpoint, {
        method: record ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The record could not be saved.");
      if (!isUser && !record && newEventMedia && result.event?.id) {
        const mediaBody = new FormData();
        mediaBody.set("media", newEventMedia.media);
        if (newEventMedia.poster) mediaBody.set("poster", newEventMedia.poster);
        const mediaResponse = await fetch(`/api/events/${result.event.id}/media`, {
          method: "POST",
          body: mediaBody,
        });
        const mediaResult = await mediaResponse.json().catch(() => ({}));
        if (!mediaResponse.ok) throw new Error(mediaResult.error ?? "Event saved, but its hero media upload failed.");
      }
      router.refresh();
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The record could not be saved.");
      setSaving(false);
    }
  }

  const user = editor.kind === "user" ? editor.record : null;
  const event = editor.kind === "event" ? editor.record : null;
  return (
    <div className="admin-editor-backdrop" role="presentation" onMouseDown={(mouseEvent) => {
      if (mouseEvent.target === mouseEvent.currentTarget) onClose();
    }}>
      <section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="admin-editor-title">
        <header>
          <div><p className="astryx-kicker">{editor.record ? "EDIT RECORD" : "CREATE RECORD"}</p><h2 id="admin-editor-title">{editor.kind === "user" ? `${user ? "Update" : "Add"} user` : `${event ? "Update" : "Add"} event`}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close editor">×</button>
        </header>
        <form className="admin-editor-form" onSubmit={submit}>
          {editor.kind === "user" ? (
            <>
              <label>Name<input name="name" defaultValue={user?.name ?? ""} required /></label>
              <label>Username<input name="username" defaultValue={user?.username ?? ""} required /></label>
              <label>Email<input name="email" type="email" defaultValue={user?.email ?? ""} required /></label>
              {!user && <label className="full">Temporary password<input name="password" type="password" minLength={10} autoComplete="new-password" required /><small>Choose a temporary password of at least 10 characters.</small></label>}
              {user && <label className="full">Reset password <small>Optional; existing passwords cannot be viewed</small><input name="password" type="password" minLength={4} autoComplete="new-password" /></label>}
              <label>Primary role<select name="role" defaultValue={user?.role ?? "model"}><option value="model">Model</option><option value="photographer">Photographer</option><option value="host">Host</option><option value="sponsor">Sponsor</option></select></label>
              <LocationAutocomplete
                name="market"
                label="Home market"
                defaultCountryCode={user?.countryCode ?? "US"}
                defaultStateCode={user?.stateCode ?? ""}
                defaultCity={user?.city ?? ""}
              />
              <label>Subscription tier<select name="tier" defaultValue={user?.tier === "pro" ? "silver" : user?.tierOverride || user?.tier || "profile"}>
                <optgroup label="Creative"><option value="none">No subscription</option><option value="profile">Basic</option><option value="creator">Creator</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option><option value="diamond">Diamond</option></optgroup>
                <optgroup label="Host"><option value="promoter_launch">Launch</option><option value="promoter_growth">Growth</option><option value="promoter_pro">Pro</option><option value="promoter_agency">Agency</option></optgroup>
                <optgroup label="Sponsor"><option value="sponsor_silver">Sponsor Silver</option><option value="sponsor_gold">Sponsor Gold</option><option value="sponsor_platinum">Sponsor Platinum</option><option value="sponsor_diamond">Sponsor Diamond</option></optgroup>
              </select></label>
              <label className="admin-checkbox"><input name="subscriptionExempt" type="checkbox" defaultChecked={user?.subscriptionExempt ?? false} /> ✓ Exempt from monthly/yearly payment</label>
              <label className="admin-checkbox"><input name="verified" type="checkbox" defaultChecked={user?.emailVerified ?? true} /> Account active (email verified)</label>
              <label className="admin-checkbox"><input name="approved" type="checkbox" defaultChecked={user?.adminApproved ?? true} /> Account approved by admin</label>
              <label>Organization<input name="organization" defaultValue={user?.organization ?? ""} /></label>
              <label>Phone<input name="phone" defaultValue={user?.phone ?? ""} /></label>
              <label className="full">Account bio<textarea name="bio" rows={3} defaultValue={user?.bio ?? ""} /></label>
              <label>Website URL<input name="websiteUrl" type="url" placeholder="https://" defaultValue={user?.websiteUrl ?? ""} /></label>
              <label>Portfolio URL<input name="portfolioUrl" type="url" placeholder="https://" defaultValue={user?.portfolioUrl ?? ""} /></label>
              {user && ["model", "photographer"].includes(user.role) && (
                <>
                  <div className="admin-editor-section full"><span>PUBLIC CREATIVE PROFILE</span><strong>/members/{user.profileSlug}</strong></div>
                  <label className="full">Public profile bio<textarea name="profileBio" rows={4} defaultValue={user.profileBio} /></label>
                  <label>Experience years<input name="experienceYears" type="number" min="0" max="80" defaultValue={user.experienceYears} /></label>
                  <label>Height<input name="height" defaultValue={user.height} /></label>
                  <label>Measurements<input name="measurements" defaultValue={user.measurements} /></label>
                  <label>Hair color<input name="hairColor" defaultValue={user.hairColor} /></label>
                  <label>Eye color<input name="eyeColor" defaultValue={user.eyeColor} /></label>
                  <label className="full">Specialties <small>Comma-separated</small><input name="specialties" defaultValue={user.specialties.join(", ")} /></label>
                  <div className="full"><AvatarManager memberId={user.id} name={user.name} role={user.role} version={user.avatarVersion} endpoint={`/api/admin/users/${user.id}/avatar`} /></div>
                  <SocialProfileInput platform="x" name="xUrl" defaultValue={user.xUrl} />
                  <SocialProfileInput platform="instagram" name="instagramUrl" defaultValue={user.instagramUrl} />
                  <SocialProfileInput platform="youtube" name="youtubeUrl" defaultValue={user.youtubeUrl} />
                  <SocialProfileInput platform="onlyfans" name="onlyfansUrl" defaultValue={user.onlyfansUrl} />
                  <label className="full">Custom URL<input name="customUrl" type="url" defaultValue={user.customUrl} /></label>
                  <label className="admin-checkbox"><input name="isAvailable" type="checkbox" defaultChecked={user.isAvailable} /> Available for work</label>
                  <label className="admin-checkbox"><input name="isPublished" type="checkbox" defaultChecked={user.isPublished} /> Public profile published</label>
                </>
              )}
              {user && (
                <div className="admin-user-message-view full">
                  <header><span>INCOMING MESSAGES</span><strong>{memberMessages.filter((message) => message.recipientId === user.id).length}</strong></header>
                  {memberMessages.filter((message) => message.recipientId === user.id).length ? (
                    memberMessages.filter((message) => message.recipientId === user.id).map((message) => (
                      <article key={message.id}>
                        <div><strong>{message.senderName}</strong><span>{new Date(message.createdAt).toLocaleString()}</span></div>
                        <b>{message.subject}</b>
                        <p>{message.body}</p>
                      </article>
                    ))
                  ) : <p>No incoming messages for this user.</p>}
                </div>
              )}
            </>
          ) : (
            <>
              {event && <ComplimentaryEventPlace eventId={event.id} admin />}
              <label>Event title<input name="title" defaultValue={event?.title ?? ""} required /></label>
              <label>Event type<input name="category" list="event-types" defaultValue={event?.category ?? "Photoshoot"} required /><datalist id="event-types">{eventTypeOptions.map((type) => <option value={type} key={type} />)}</datalist></label>
              <LocationAutocomplete
                name="location"
                label="Location"
                defaultCountryCode={event?.countryCode ?? "US"}
                defaultStateCode={event?.stateCode ?? ""}
                defaultCity={event?.city ?? ""}
              />
              <label>Venue<input name="venue" defaultValue={event?.venue ?? ""} /></label>
              <label className="full">External event website<input name="externalEventUrl" type="url" placeholder="https://" defaultValue={event?.externalEventUrl ?? ""} /><small>Optional. Hosts can keep the local event page while saving a reference URL.</small></label>
              <label className="admin-checkbox full"><input name="redirectToExternal" type="checkbox" defaultChecked={event?.redirectToExternal ?? false} /> Redirect public event visitors to the external website</label>
              <label>Starts<input name="startsAt" type="datetime-local" defaultValue={localDateTime(event?.startsAt ?? null)} required /></label>
              <label>Ends<input name="endsAt" type="datetime-local" defaultValue={localDateTime(event?.endsAt ?? null)} /></label>
              <label>Cost ($)<input name="costDollars" type="number" min="0" step="1" defaultValue={event?.costDollars ?? 0} required /></label>
              <label>Refund cutoff<input name="refundDaysBefore" type="number" min="0" max="365" defaultValue={event?.refundDaysBefore ?? 45} required /><small>Full refunds are available until this many days before the event.</small></label>
              <label className="admin-checkbox"><input name="noRefunds" type="checkbox" defaultChecked={event?.noRefunds ?? false} /> No refunds for this event</label>
              <label className="admin-checkbox"><input name="passportRequired" type="checkbox" defaultChecked={event?.passportRequired ?? false} /> Passport required</label>
              <fieldset className="full travel-editor-section"><legend>Flying instructions</legend><p>Saving changed travel details notifies paid, confirmed attendees.</p><EventTravelEditor initial={event?.travelDetails} /><label>Additional airport information<textarea name="airportInfo" rows={3} maxLength={1200} defaultValue={event?.airportInfo ?? ""} /></label><label>Additional flying instructions<textarea name="flightInstructions" rows={4} maxLength={1800} defaultValue={event?.flightInstructions ?? ""} /></label>{event && <AttendeeFlightDetails eventId={event.id} manager />}</fieldset>
              <label className="full">Custom refund terms<textarea name="refundTerms" rows={3} maxLength={1000} defaultValue={event?.refundTerms ?? ""} placeholder="Optional exceptions or processing details" /></label>
              <fieldset className="host-shoot-type-options full">
                <legend>Shoot types</legend>
                {shootTypeOptions.map((type) => (
                  <label key={type}><input name="shootTypes" type="checkbox" value={type} defaultChecked={event?.shootTypes.includes(type) ?? false} /> {type}</label>
                ))}
              </fieldset>
              <label>Total spots<input name="capacity" type="number" min="1" defaultValue={event?.capacity ?? 12} required /></label>
              <label>Spots available<input name="spotsRemaining" type="number" min="0" defaultValue={event?.spotsRemaining ?? 12} required /></label>
              <label>Image path<input name="imagePath" defaultValue={event?.imagePath ?? "/images/desert-production.png"} required /></label>
              {event && (
                <div className="full">
                  <span className="admin-field-heading">Event hero media</span>
                  <EventMediaManager
                    eventId={event.id}
                    currentMedia={event.hasMedia ? `/api/events/${event.id}/media` : event.imagePath}
                    currentPoster={event.hasPoster ? `/api/events/${event.id}/media?poster=1` : event.imagePath}
                    currentType={event.hasMedia ? event.mediaType : "image"}
                  />
                </div>
              )}
              {!event && (
                <div className="full">
                  <span className="admin-field-heading">Event hero media</span>
                  <EventMediaPicker onPrepared={setNewEventMedia} />
                </div>
              )}
              <label className="full">Short summary<textarea name="summary" rows={3} defaultValue={event?.summary ?? ""} required /></label>
              <label className="full">Full description<textarea name="description" rows={5} defaultValue={event?.description ?? ""} /></label>
              <label>What’s included<textarea name="included" rows={6} defaultValue={event?.included.join("\n") ?? ""} placeholder="One item per line" /></label>
              <div className="full">
                <span className="admin-field-heading">Participation paths</span>
                <ParticipationPathEditor initialPaths={event?.participationPaths} />
              </div>
              <label className="admin-checkbox"><input name="isFeatured" type="checkbox" defaultChecked={event?.isFeatured ?? false} /> Feature this event</label>
              <label className="admin-checkbox"><input name="isPublished" type="checkbox" defaultChecked={event?.isPublished ?? true} /> Published publicly</label>
            </>
          )}
          {error && <p className="form-error full" role="alert">{error}</p>}
          <div className="admin-editor-actions full">
            {editor.kind === "user" && editor.record && <button className="admin-delete-user" type="button" onClick={() => setConfirmingUserDelete(true)}>Delete user</button>}
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </section>
      {confirmingUserDelete && editor.kind === "user" && editor.record && createPortal((
        <div className="admin-delete-user-backdrop" onMouseDown={() => !saving && setConfirmingUserDelete(false)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="astryx-kicker">PERMANENT ACCOUNT DELETION</p>
            <h2 id="delete-user-title">Delete {editor.record.name}?</h2>
            <p>Profiles, unused images, identity files, reviews, events, sponsorship records, sessions, and billing records will be removed. Messages already sent to other members will remain under this member’s current display name.</p>
            <div>
              <button type="button" disabled={saving} onClick={() => setConfirmingUserDelete(false)}>Keep user</button>
              <button type="button" disabled={saving} onClick={deleteUser}>{saving ? "Deleting…" : "Delete account permanently"}</button>
            </div>
          </section>
        </div>
      ), document.body)}
    </div>
  );
}
