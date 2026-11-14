import { eventStartingPriceLabel } from "@/lib/event-starting-price";
import { and, asc, count, desc, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { HomeEvent, HomeMember } from "@/app/home-client";
import { db, pool } from "./index";
import { tierGrantsPaidAccess } from "@/lib/access-entitlements";
import {
  billingCustomers,
  collaborationMessages,
  collaborationRequests,
  identityAuditLogs,
  identityDocuments,
  eventParticipations,
  eventTransactions,
  eventProposals,
  eventDeletionLogs,
  eventSponsors,
  events,
  homeHeroSlides,
  members,
  portfolioItems,
  profiles,
  sponsors,
  sponsorMembers,
  sponsorTierChangeRequests,
  sponsorshipRequests,
  sponsorshipAgreements,
  subscriptions,
  sitePageSettings,
} from "./schema";

const collaborationSenders = alias(members, "collaboration_senders");
const collaborationRecipients = alias(members, "collaboration_recipients");
const messageAuthors = alias(members, "message_authors");
const collaborationSenderProfiles = alias(profiles, "collaboration_sender_profiles");
const collaborationRecipientProfiles = alias(profiles, "collaboration_recipient_profiles");
const eventOwners = alias(members, "event_owners");
const sponsorshipTargets = alias(members, "sponsorship_targets");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  timeZone: "America/Phoenix",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "America/Phoenix",
});

const eventDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Phoenix",
});

const eventPriceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const profileTierPriority = sql<number>`case ${profiles.membershipTier}
  when 'diamond' then 0
  when 'platinum' then 1
  when 'gold' then 2
  when 'silver' then 3
  when 'pro' then 3
  when 'creator' then 4
  else 5
end`;

const eventPublicFields = {
  id: events.id,
  ownerId: events.ownerId,
  slug: events.slug,
  title: events.title,
  category: events.category,
  location: events.location,
  countryCode: events.countryCode,
  stateCode: events.stateCode,
  city: events.city,
  introSentence: events.introSentence,
  summary: events.summary,
  description: events.description,
  imagePath: events.imagePath,
  mediaType: events.mediaType,
  hasMedia: sql<boolean>`${events.mediaData} is not null`,
  hasPoster: sql<boolean>`${events.posterData} is not null`,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  venue: events.venue,
  externalEventUrl: events.externalEventUrl,
  redirectToExternal: events.redirectToExternal,
  priceCents: events.priceCents,
  refundDaysBefore: events.refundDaysBefore,
  showRefundNote: events.showRefundNote,
  flightCostsExcluded: events.flightCostsExcluded,
  refundTerms: events.refundTerms,
  noRefunds: events.noRefunds,
  passportRequired: events.passportRequired,
  shootTypes: events.shootTypes,
  participationPaths: events.participationPaths,
  accommodationLinks: events.accommodationLinks,
  accommodationDetails: events.accommodationDetails,
  included: events.included,
  requirements: events.requirements,
  hotelAvailable: events.hotelAvailable,
  hotelPriceCents: events.hotelPriceCents,
  hotelModelsAllowed: events.hotelModelsAllowed,
  hotelPhotographersAllowed: events.hotelPhotographersAllowed,
  villaAvailable: events.villaAvailable,
  villaPriceCents: events.villaPriceCents,
  villaModelPriceCents: events.villaModelPriceCents,
  villaPhotographerPriceCents: events.villaPhotographerPriceCents,
  villaModelSpots: events.villaModelSpots,
  villaPhotographerSpots: events.villaPhotographerSpots,
  villaModelsAllowed: events.villaModelsAllowed,
  villaPhotographersAllowed: events.villaPhotographersAllowed,
  airportInfo: events.airportInfo,
  travelDetails: events.travelDetails,
  flightInstructions: events.flightInstructions,
  capacity: events.capacity,
  spotsRemaining: events.spotsRemaining,
  isFeatured: events.isFeatured,
  isPublished: events.isPublished,
  createdAt: events.createdAt,
  updatedAt: events.updatedAt,
};

const pageBase = { headerBackgroundColor: "#11110f", content: {} as Record<string, string> };
export const defaultSitePageSettings = {
  home: { ...pageBase, pageKey: "home", eyebrow: "Model Escape", title: "Creative people. Remarkable places.", intro: "Work worth remembering.", imagePath: "/images/desert-model.jpg", seoTitle: "Model Escape", seoDescription: "Creative people, remarkable places, and work worth remembering.", shareImagePath: "/images/desert-model.jpg", content: { builtEyebrow: "Built for the work", builtTitle: "Less scrolling. More creating.", builtIntro: "Model Escape is intentionally smaller than a social network. Every member is verified, every event is produced, and every collaboration begins with clear expectations.", membershipEyebrow: "Founding membership", membershipTitle: "Come for the escape. Stay for the people.", membershipIntro: "Start with a free profile. Upgrade when you need more portfolio space, priority access, and direct messaging." } },
  events: { ...pageBase, pageKey: "events", eyebrow: "Events", title: "Show up ready to make the work.", intro: "Small groups, clear briefs, considered locations, and production support from call time to wrap.", imagePath: "/images/desert-model.jpg", seoTitle: "Events — Model Escape", seoDescription: "Discover upcoming Model Escape creative events.", shareImagePath: "/images/desert-model.jpg" },
  models: { ...pageBase, pageKey: "models", eyebrow: "Model directory", title: "Every face brings a different story.", intro: "Reviewed model profiles with availability, experience, specialties, and tier-based portfolios.", imagePath: "/images/models/model-08.jpg", seoTitle: "Models — Model Escape", seoDescription: "Browse reviewed model profiles.", shareImagePath: "/images/models/model-08.jpg" },
  photographers: { ...pageBase, pageKey: "photographers", eyebrow: "Photographer directory", title: "Find the eye your idea deserves.", intro: "Reviewed photographers with clear specialties, availability, and work built for real productions.", imagePath: "/images/neon-studio.png", seoTitle: "Photographers — Model Escape", seoDescription: "Browse reviewed Model Escape photographers.", shareImagePath: "/images/neon-studio.png" },
  discover: { ...pageBase, pageKey: "discover", eyebrow: "Discover", title: "Find the person the brief needs.", intro: "A reviewed community of models and photographers who value preparation, collaboration, and the final work.", imagePath: "/images/daisy.jpg", seoTitle: "Discover — Model Escape", seoDescription: "Discover models and photographers in the Model Escape community.", shareImagePath: "/images/daisy.jpg" },
  host: { ...pageBase, pageKey: "host", eyebrow: "Host an event", title: "Create, recruit, collect, and operate.", intro: "One Host workspace brings events, models, photographers, sponsors, guests, messaging, payments, and reputation together.", imagePath: "/images/creative-planning.png", seoTitle: "Host — Model Escape", seoDescription: "Create and operate a Model Escape event.", shareImagePath: "/images/creative-planning.png" },
  membership: { ...pageBase, pageKey: "membership", eyebrow: "Membership", title: "Build visibility at your pace.", intro: "Choose the membership and tools designed for your role.", imagePath: "/images/daisy.jpg", seoTitle: "Membership — Model Escape", seoDescription: "Explore Model Escape memberships.", shareImagePath: "/images/daisy.jpg" },
  about: { ...pageBase, pageKey: "about", eyebrow: "Why Model Escape", title: "The network is smaller on purpose.", intro: "We replace endless feeds and uncertain DMs with reviewed people, scoped productions, and clear expectations.", imagePath: "/images/creative-planning.png", seoTitle: "Our Story — Model Escape", seoDescription: "Learn why Model Escape is built around trusted creative work.", shareImagePath: "/images/creative-planning.png" },
} as const;

export type SitePageSetting = { pageKey: string; eyebrow: string; title: string; intro: string; imagePath: string; headerBackgroundColor: string; content: Record<string, string>; seoTitle: string; seoDescription: string; shareImagePath: string };
export function getSitePageSettings(): Promise<SitePageSetting[]>;
export function getSitePageSettings(pageKey: keyof typeof defaultSitePageSettings): Promise<SitePageSetting>;
export async function getSitePageSettings(pageKey?: keyof typeof defaultSitePageSettings): Promise<SitePageSetting | SitePageSetting[]> {
  const rows = await db.select().from(sitePageSettings);
  const merged = Object.values(defaultSitePageSettings).map((fallback) => {
    const row = rows.find((candidate) => candidate.pageKey === fallback.pageKey);
    return row ? { ...fallback, ...row, content: { ...fallback.content, ...row.content } } : fallback;
  });
  return pageKey ? merged.find((row) => row.pageKey === pageKey)! : merged;
}

export async function getHomeData(): Promise<{
  events: HomeEvent[];
  members: HomeMember[];
  photographers: HomeMember[];
  heroSlides: Awaited<ReturnType<typeof getHomeHeroSlides>>;
}> {
  const [eventRows, profileRows, photographerRows, heroSlides] = await Promise.all([
    db
      .select(eventPublicFields)
      .from(events)
      .where(and(eq(events.isPublished, true), gt(events.startsAt, new Date())))
      .orderBy(asc(events.startsAt))
      .limit(8),
    db
      .select()
      .from(profiles)
      .where(and(eq(profiles.isPublished, true), eq(profiles.role, "model")))
      .orderBy(asc(profileTierPriority), desc(profiles.createdAt))
      .limit(8),
    db
      .select()
      .from(profiles)
      .where(and(eq(profiles.isPublished, true), eq(profiles.role, "photographer")))
      .orderBy(asc(profileTierPriority), desc(profiles.createdAt))
      .limit(4),
    getHomeHeroSlides(),
  ]);

  return {
    events: eventRows.map((event) => ({
      slug: event.slug,
      id: event.id,
      image: event.hasMedia ? `/api/events/${event.id}/media` : event.imagePath,
      poster: event.hasMedia ? `/api/events/${event.id}/media?poster=1` : event.imagePath,
      mediaType: event.hasMedia && event.mediaType === "video" ? "video" : "image",
      date: dateFormatter.format(event.startsAt),
      month: monthFormatter.format(event.startsAt).toUpperCase(),
      title: event.title,
      location: event.location,
      detail: event.summary,
      category: event.category,
      summary: event.summary,
      startsLabel: eventDateTimeFormatter.format(event.startsAt),
      venue: event.venue || event.location,
      price: eventStartingPriceLabel(event),
      spotsRemaining: event.spotsRemaining,
      capacity: event.capacity,
    })),
    members: profileRows.map((profile) => ({
      slug: profile.slug,
      name: profile.name,
      role: profile.role === "model" ? "Model" : "Photographer",
      location: profile.location,
      image: profile.imagePath,
      available: profile.isAvailable,
      tier: profile.membershipTier,
      bio: profile.bio,
      experienceYears: profile.experienceYears,
      specialties: profile.specialties,
      isPremiumBlur: profile.isPremiumBlur,
    })),
    photographers: photographerRows.map((profile) => ({
      slug: profile.slug,
      name: profile.name,
      role: "Photographer",
      location: profile.location,
      image: profile.imagePath,
      available: profile.isAvailable,
      tier: profile.membershipTier,
      bio: profile.bio,
      experienceYears: profile.experienceYears,
      specialties: profile.specialties,
      isPremiumBlur: profile.isPremiumBlur,
    })),
    heroSlides,
  };
}

export async function getHomeHeroSlides() {
  return db
    .select({
      id: homeHeroSlides.id,
      mediaType: homeHeroSlides.mediaType,
      mediaPath: homeHeroSlides.mediaPath,
      hasUpload: sql<boolean>`${homeHeroSlides.mediaData} is not null`,
      hasPoster: sql<boolean>`${homeHeroSlides.posterData} is not null`,
      eyebrow: homeHeroSlides.eyebrow,
      title: homeHeroSlides.title,
      accentText: homeHeroSlides.accentText,
      copy: homeHeroSlides.copy,
      ctaLabel: homeHeroSlides.ctaLabel,
      ctaHref: homeHeroSlides.ctaHref,
      altText: homeHeroSlides.altText,
      sortOrder: homeHeroSlides.sortOrder,
    })
    .from(homeHeroSlides)
    .where(eq(homeHeroSlides.isActive, true))
    .orderBy(asc(homeHeroSlides.sortOrder), asc(homeHeroSlides.createdAt));
}

export async function getAdminHeroSlides() {
  return db
    .select({
      id: homeHeroSlides.id,
      mediaType: homeHeroSlides.mediaType,
      mediaPath: homeHeroSlides.mediaPath,
      hasUpload: sql<boolean>`${homeHeroSlides.mediaData} is not null`,
      hasPoster: sql<boolean>`${homeHeroSlides.posterData} is not null`,
      mediaMime: homeHeroSlides.mediaMime,
      eyebrow: homeHeroSlides.eyebrow,
      title: homeHeroSlides.title,
      accentText: homeHeroSlides.accentText,
      copy: homeHeroSlides.copy,
      ctaLabel: homeHeroSlides.ctaLabel,
      ctaHref: homeHeroSlides.ctaHref,
      altText: homeHeroSlides.altText,
      sortOrder: homeHeroSlides.sortOrder,
      isActive: homeHeroSlides.isActive,
      updatedAt: homeHeroSlides.updatedAt,
    })
    .from(homeHeroSlides)
    .orderBy(asc(homeHeroSlides.sortOrder), asc(homeHeroSlides.createdAt));
}

export async function getPublishedEvents() {
  return db
    .select(eventPublicFields)
    .from(events)
    .where(and(eq(events.isPublished, true), gt(events.startsAt, new Date())))
    .orderBy(asc(events.startsAt));
}

export async function getEventBySlug(slug: string) {
  const [event] = await db
    .select(eventPublicFields)
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.isPublished, true), gt(events.startsAt, new Date())))
    .limit(1);
  return event ?? null;
}

export async function getEventHost(eventId: string) {
  const [host] = await db
    .select({
      id: members.id,
      name: members.name,
      username: members.username,
      role: members.primaryRole,
      homeMarket: members.homeMarket,
      avatarUpdatedAt: members.avatarUpdatedAt,
      lastActiveAt: members.lastActiveAt,
      isOnline: sql<boolean>`${members.lastActiveAt} > now() - interval '3 minutes'`,
      isVerified: sql<boolean>`${members.identityVerificationStatus} = 'approved'`,
      profileSlug: profiles.slug,
      profileImagePath: profiles.imagePath,
    })
    .from(events)
    .innerJoin(members, eq(events.ownerId, members.id))
    .leftJoin(profiles, eq(profiles.memberId, members.id))
    .where(eq(events.id, eventId))
    .limit(1);
  return host ?? null;
}

export async function getEventParticipationAvailability(eventId: string) {
  const rows = await db
    .select({
      pathType: eventParticipations.pathType,
      status: eventParticipations.status,
    })
    .from(eventParticipations)
    .where(eq(eventParticipations.eventId, eventId));
  const activeStatuses = new Set([
    "pending",
    "approved",
    "awaiting_payment",
    "confirmed",
  ]);
  return rows.reduce<Record<string, number>>((counts, row) => {
    if (activeStatuses.has(row.status)) {
      counts[row.pathType] = (counts[row.pathType] ?? 0) + 1;
    }
    return counts;
  }, {});
}

export async function getEventAttendingModels(eventId: string) {
  return db
    .select({
      name: profiles.name,
      slug: profiles.slug,
      imagePath: profiles.imagePath,
      memberId: members.id,
      avatarUpdatedAt: members.avatarUpdatedAt,
      lastActiveAt: members.lastActiveAt,
      isOnline: sql<boolean>`${members.lastActiveAt} > now() - interval '3 minutes'`,
      location: profiles.location,
      role: profiles.role,
    })
    .from(eventParticipations)
    .innerJoin(profiles, eq(eventParticipations.memberId, profiles.memberId))
    .innerJoin(members, eq(eventParticipations.memberId, members.id))
    .where(
      and(
        eq(eventParticipations.eventId, eventId),
        eq(eventParticipations.pathType, "model"),
        eq(eventParticipations.status, "confirmed"),
        eq(profiles.isPublished, true),
        isNull(members.deletedAt),
        sql`(${eventParticipations.priceCents} = 0 or exists (select 1 from event_transactions paid where paid.participation_id = ${eventParticipations.id} and paid.status = 'paid' and paid.gross_cents > 0))`,
      ),
    )
    .orderBy(asc(profileTierPriority), asc(profiles.name));
}

export async function getEventAttendingPhotographers(eventId: string) {
  return db
    .select({
      name: profiles.name,
      slug: profiles.slug,
      imagePath: profiles.imagePath,
      memberId: members.id,
      avatarUpdatedAt: members.avatarUpdatedAt,
      isOnline: sql<boolean>`${members.lastActiveAt} > now() - interval '3 minutes'`,
      location: profiles.location,
      role: profiles.role,
    })
    .from(eventParticipations)
    .innerJoin(profiles, eq(eventParticipations.memberId, profiles.memberId))
    .innerJoin(members, eq(eventParticipations.memberId, members.id))
    .where(
      and(
        eq(eventParticipations.eventId, eventId),
        eq(eventParticipations.pathType, "photographer"),
        eq(eventParticipations.status, "confirmed"),
        eq(profiles.isPublished, true),
        isNull(members.deletedAt),
        sql`(${eventParticipations.priceCents} = 0 or exists (select 1 from event_transactions paid where paid.participation_id = ${eventParticipations.id} and paid.status = 'paid' and paid.gross_cents > 0))`,
      ),
    )
    .orderBy(asc(profileTierPriority), asc(profiles.name));
}

export async function getEventSponsors(eventId: string) {
  return db
    .select({
      id: sponsors.id,
      slug: sponsors.slug,
      name: sponsors.name,
      category: sponsors.category,
      logoPath: sponsors.logoPath,
      hasLogoUpload: sql<boolean>`${sponsors.logoData} is not null`,
      logoFilename: sponsors.logoFilename,
      websiteUrl: sponsors.websiteUrl,
      level: eventSponsors.level,
      contribution: eventSponsors.contribution,
    })
    .from(eventSponsors)
    .innerJoin(sponsors, eq(eventSponsors.sponsorId, sponsors.id))
    .where(eq(eventSponsors.eventId, eventId))
    .orderBy(asc(sponsors.name));
}

export async function getPendingSponsorTierChanges(memberId: string) {
  return db.select({
    id: sponsorTierChangeRequests.id,
    previousLevel: sponsorTierChangeRequests.previousLevel,
    requestedLevel: sponsorTierChangeRequests.requestedLevel,
    createdAt: sponsorTierChangeRequests.createdAt,
  }).from(sponsorTierChangeRequests)
    .where(and(eq(sponsorTierChangeRequests.memberId, memberId), eq(sponsorTierChangeRequests.status, "pending")))
    .orderBy(desc(sponsorTierChangeRequests.createdAt));
}

export async function getPublishedProfiles() {
  return db.select().from(profiles).where(eq(profiles.isPublished, true)).orderBy(asc(profileTierPriority), desc(profiles.createdAt));
}

export async function getPaginatedModels(page: number, pageSize = 12) {
  const safePage = Math.max(1, Math.floor(page));
  const where = and(eq(profiles.isPublished, true), eq(profiles.role, "model"));
  const [[totalRow], rows] = await Promise.all([
    db.select({ value: count() }).from(profiles).where(where),
    db
      .select()
      .from(profiles)
      .where(where)
      .orderBy(asc(profileTierPriority), desc(profiles.createdAt), asc(profiles.name))
      .limit(pageSize)
      .offset((safePage - 1) * pageSize),
  ]);
  const total = Number(totalRow?.value ?? 0);
  return {
    profiles: rows,
    page: safePage,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPaginatedPhotographers(page: number, pageSize = 12) {
  const safePage = Math.max(1, Math.floor(page));
  const where = and(eq(profiles.isPublished, true), eq(profiles.role, "photographer"));
  const [[totalRow], rows] = await Promise.all([
    db.select({ value: count() }).from(profiles).where(where),
    db
      .select()
      .from(profiles)
      .where(where)
      .orderBy(asc(profileTierPriority), desc(profiles.createdAt), asc(profiles.name))
      .limit(pageSize)
      .offset((safePage - 1) * pageSize),
  ]);
  const total = Number(totalRow?.value ?? 0);
  return {
    profiles: rows,
    page: safePage,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export const portfolioLimits = {
  profile: 0,
  creator: 8,
  silver: 16,
  gold: 24,
  platinum: 40,
  diamond: 60,
  pro: 16,
} as const;

export async function getProfileBySlug(slug: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.slug, slug), eq(profiles.isPublished, true)))
    .limit(1);

  if (!profile) return null;
  const tier =
    profile.membershipTier === "pro"
      ? "silver"
      : profile.membershipTier in portfolioLimits
        ? profile.membershipTier as keyof typeof portfolioLimits
        : "profile";
  const [portfolio, [activity]] = await Promise.all([
    db
      .select()
      .from(portfolioItems)
      .where(
        and(
          eq(portfolioItems.profileId, profile.id),
          eq(portfolioItems.isPublished, true),
        ),
      )
      .orderBy(asc(portfolioItems.sortOrder))
      .limit(portfolioLimits[tier]),
    profile.memberId
      ? db
          .select({
            lastActiveAt: members.lastActiveAt,
            avatarUpdatedAt: members.avatarUpdatedAt,
            username: members.username,
            cameraBrand: members.cameraBrand,
            isOnline: sql<boolean>`${members.lastActiveAt} > now() - interval '3 minutes'`,
          })
          .from(members)
          .where(eq(members.id, profile.memberId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    profile: { ...profile, membershipTier: tier },
    portfolio,
    lastActiveAt: activity?.lastActiveAt ?? null,
    avatarUpdatedAt: activity?.avatarUpdatedAt ?? null,
    username: activity?.username ?? null,
    cameraBrand: activity?.cameraBrand ?? null,
    isOnline: activity?.isOnline ?? false,
  };
}

export async function memberHasPaidAccess(memberId: string) {
  const [record] = await db
    .select({
      tierOverride: members.membershipTierOverride,
      subscriptionExempt: members.subscriptionExempt,
      activeSubscriptions: sql<number>`count(${subscriptions.id}) filter (where ${subscriptions.status} in ('active', 'trialing'))::int`,
    })
    .from(members)
    .leftJoin(billingCustomers, eq(billingCustomers.memberId, members.id))
    .leftJoin(subscriptions, eq(subscriptions.billingCustomerId, billingCustomers.id))
    .where(eq(members.id, memberId))
    .groupBy(members.id)
    .limit(1);
  if (!record) return false;
  return tierGrantsPaidAccess(record.tierOverride, record.subscriptionExempt, Number(record.activeSubscriptions));
}

export async function getPublicMemberByUsername(username: string) {
  const [member] = await db
    .select({
      id: members.id,
      username: members.username,
      name: members.name,
      primaryRole: members.primaryRole,
      homeMarket: members.homeMarket,
      organization: members.organization,
      bio: members.bio,
      websiteUrl: members.websiteUrl,
      avatarUpdatedAt: members.avatarUpdatedAt,
      lastActiveAt: members.lastActiveAt,
      isOnline: sql<boolean>`${members.lastActiveAt} > now() - interval '3 minutes'`,
      isVerified: sql<boolean>`${members.identityVerificationStatus} = 'approved'`,
      profileSlug: profiles.slug,
      profileImagePath: profiles.imagePath,
    })
    .from(members)
    .leftJoin(profiles, eq(profiles.memberId, members.id))
    .where(and(eq(members.username, username), isNotNull(members.emailVerifiedAt)))
    .limit(1);
  return member ?? null;
}

export async function getMemberReviewSummary(memberId: string | null) {
  if (!memberId) return null;
  const result = await pool.query(
    `select
       count(*)::int as review_count,
       round(avg(overall_rating)::numeric, 1)::float as overall,
       round(avg(reliability_rating)::numeric, 1)::float as reliability,
       round(avg(professionalism_rating)::numeric, 1)::float as professionalism,
       round((100.0 * avg(case when would_work_again then 1 else 0 end))::numeric)::int as would_work_again_percent,
       round((100.0 * avg(case when no_show then 1 else 0 end))::numeric)::int as flake_rate
     from member_reviews
     where reviewed_member_id = $1 and status = 'published'`,
    [memberId],
  );
  const row = result.rows[0];
  if (!row?.review_count) return null;
  return {
    reviewCount: row.review_count as number,
    overall: row.overall as number,
    reliability: row.reliability as number,
    professionalism: row.professionalism as number,
    wouldWorkAgainPercent: row.would_work_again_percent as number,
    flakeRate: row.flake_rate as number,
  };
}

export async function getAdminReviews() {
  const result = await pool.query(
    `select r.id, r.overall_rating, r.reliability_rating, r.professionalism_rating,
            r.would_work_again, r.no_show, r.comment, r.status, r.created_at,
            e.title as event_title,
            reviewer.id as reviewer_id, reviewer.name as reviewer_name,
            reviewer.username as reviewer_username,
            reviewer.avatar_updated_at as reviewer_avatar_updated_at,
            reviewer_profile.slug as reviewer_profile_slug,
            reviewer_profile.image_path as reviewer_image_path,
            reviewed.id as reviewed_id, reviewed.name as reviewed_name,
            reviewed.username as reviewed_username,
            reviewed.primary_role as reviewed_role,
            reviewed.avatar_updated_at as reviewed_avatar_updated_at,
            reviewed_profile.slug as reviewed_profile_slug,
            reviewed_profile.image_path as reviewed_image_path
       from member_reviews r
       join events e on e.id = r.event_id
       join members reviewer on reviewer.id = r.reviewer_member_id
       join members reviewed on reviewed.id = r.reviewed_member_id
       left join profiles reviewer_profile on reviewer_profile.member_id = reviewer.id
       left join profiles reviewed_profile on reviewed_profile.member_id = reviewed.id
      order by case when r.status = 'pending_moderation' then 0 else 1 end, r.created_at desc`,
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    overallRating: row.overall_rating as number,
    reliabilityRating: row.reliability_rating as number,
    professionalismRating: row.professionalism_rating as number,
    wouldWorkAgain: row.would_work_again as boolean,
    noShow: row.no_show as boolean,
    comment: row.comment as string,
    status: row.status as string,
    eventTitle: row.event_title as string,
    reviewerId: row.reviewer_id as string,
    reviewerName: row.reviewer_name as string,
    reviewerUsername: row.reviewer_username as string | null,
    reviewerAvatarUpdatedAt: row.reviewer_avatar_updated_at as Date | null,
    reviewerProfileSlug: row.reviewer_profile_slug as string | null,
    reviewerImagePath: row.reviewer_image_path as string | null,
    reviewedId: row.reviewed_id as string,
    reviewedName: row.reviewed_name as string,
    reviewedUsername: row.reviewed_username as string | null,
    reviewedRole: row.reviewed_role as string,
    reviewedAvatarUpdatedAt: row.reviewed_avatar_updated_at as Date | null,
    reviewedProfileSlug: row.reviewed_profile_slug as string | null,
    reviewedImagePath: row.reviewed_image_path as string | null,
    createdAt: row.created_at as Date,
  }));
}

export async function getMemberReviewsByUsername(username: string) {
  const memberResult = await pool.query(
    `select member.id, member.name, member.username, member.primary_role,
            member.avatar_updated_at, profile.slug as profile_slug,
            profile.image_path
       from members member
       left join profiles profile on profile.member_id = member.id
      where member.username = $1
      limit 1`,
    [username],
  );
  const member = memberResult.rows[0];
  if (!member) return null;
  const reviewsResult = await pool.query(
    `select review.id, review.overall_rating, review.reliability_rating,
            review.professionalism_rating, review.would_work_again,
            review.no_show, review.comment, review.created_at,
            event.title as event_title, event.slug as event_slug,
            reviewer.id as reviewer_id, reviewer.name as reviewer_name,
            reviewer.username as reviewer_username,
            reviewer.avatar_updated_at as reviewer_avatar_updated_at,
            reviewer_profile.slug as reviewer_profile_slug,
            reviewer_profile.image_path as reviewer_image_path
       from member_reviews review
       join events event on event.id = review.event_id
       join members reviewer on reviewer.id = review.reviewer_member_id
       left join profiles reviewer_profile on reviewer_profile.member_id = reviewer.id
      where review.reviewed_member_id = $1
        and review.status = 'published'
      order by review.created_at desc`,
    [member.id],
  );
  return {
    member: {
      id: member.id as string,
      name: member.name as string,
      username: member.username as string,
      primaryRole: member.primary_role as string,
      avatarUpdatedAt: member.avatar_updated_at as Date | null,
      profileSlug: member.profile_slug as string | null,
      imagePath: member.image_path as string | null,
    },
    reviews: reviewsResult.rows.map((row) => ({
      id: row.id as string,
      overallRating: row.overall_rating as number,
      reliabilityRating: row.reliability_rating as number,
      professionalismRating: row.professionalism_rating as number,
      wouldWorkAgain: row.would_work_again as boolean,
      noShow: row.no_show as boolean,
      comment: row.comment as string,
      createdAt: row.created_at as Date,
      eventTitle: row.event_title as string,
      eventSlug: row.event_slug as string,
      reviewerId: row.reviewer_id as string,
      reviewerName: row.reviewer_name as string,
      reviewerUsername: row.reviewer_username as string | null,
      reviewerAvatarUpdatedAt: row.reviewer_avatar_updated_at as Date | null,
      reviewerProfileSlug: row.reviewer_profile_slug as string | null,
      reviewerImagePath: row.reviewer_image_path as string | null,
    })),
  };
}

export async function getMemberReliabilityEvents(memberId: string | null) {
  if (!memberId) return [];
  const result = await pool.query(
    `select distinct e.id, e.slug, e.title, e.starts_at, e.location,
            participation.status as participation_status,
            participation.withdrawal_reason,
            exists(
              select 1 from member_reviews review
               where review.event_id = e.id
                 and review.reviewed_member_id = $1
                 and review.no_show = true
                 and review.status = 'published'
            ) as no_show
       from event_participations participation
       join events e on e.id = participation.event_id
      where participation.member_id = $1
        and e.is_published = true
        and participation.status = 'confirmed'
        and participation.checked_in_at is not null
        and participation.withdrawn_at is null
      order by e.starts_at desc
      limit 20`,
    [memberId],
  );
  return result.rows as Array<{
    id: string;
    slug: string;
    title: string;
    starts_at: Date;
    location: string;
    participation_status: string;
    withdrawal_reason: string | null;
    no_show: boolean;
  }>;
}

export async function getUpcomingEventsForMember(memberId: string | null) {
  if (!memberId) return [];
  const result = await pool.query(
    `select distinct e.id, e.slug, e.title, e.starts_at, e.location
       from event_participations participation
       join events e on e.id = participation.event_id
      where participation.member_id = $1
        and participation.status = 'confirmed'
        and e.is_published = true
        and coalesce(e.ends_at, e.starts_at) >= now()
      order by e.starts_at asc
      limit 12`,
    [memberId],
  );
  return result.rows as Array<{
    id: string;
    slug: string;
    title: string;
    starts_at: Date;
    location: string;
  }>;
}

export async function getEligibleReviewTargets(memberId: string) {
  const result = await pool.query(
    `with eligible as (
       select distinct
         e.id as event_id,
         e.title as event_title,
         target.id as member_id,
         target.name,
         target.primary_role as role,
         (e.owner_id = $1) as reviewer_is_host
       from events e
       join members reviewer on reviewer.id = $1
       join event_participations target_participation
         on target_participation.event_id = e.id
        and target_participation.status = 'confirmed'
       join members target on target.id = target_participation.member_id
       left join event_participations reviewer_participation
         on reviewer_participation.event_id = e.id
        and reviewer_participation.member_id = $1
        and reviewer_participation.status = 'confirmed'
       where coalesce(e.ends_at, e.starts_at) < now()
         and target.id <> $1
         and (
           (e.owner_id = $1 and reviewer.primary_role = 'host' and target.primary_role in ('model', 'photographer'))
           or
           (reviewer_participation.id is not null and reviewer.primary_role = 'photographer' and target.primary_role = 'model')
           or
           (reviewer_participation.id is not null and reviewer.primary_role = 'model' and target.primary_role = 'photographer')
         )
       union
       select
         e.id,
         e.title,
         host.id,
         host.name,
         host.primary_role,
         false
       from events e
       join event_participations reviewer_participation
         on reviewer_participation.event_id = e.id
        and reviewer_participation.member_id = $1
        and reviewer_participation.status = 'confirmed'
       join members reviewer on reviewer.id = $1 and reviewer.primary_role = 'model'
       join members host on host.id = e.owner_id and host.primary_role = 'host'
       where coalesce(e.ends_at, e.starts_at) < now()
     )
     select eligible.*
       from eligible
       left join member_reviews review
         on review.event_id = eligible.event_id
        and review.reviewer_member_id = $1
        and review.reviewed_member_id = eligible.member_id
      where review.id is null
      order by event_title, name
     limit 50`,
    [memberId],
  );
  return result.rows as Array<{
    event_id: string;
    event_title: string;
    member_id: string;
    name: string;
    role: "model" | "photographer" | "host";
    reviewer_is_host: boolean;
  }>;
}

export async function getRecentProposals() {
  return db.select().from(eventProposals).orderBy(desc(eventProposals.createdAt)).limit(50);
}

export async function getEventDeletionLogs() {
  return db.select().from(eventDeletionLogs).orderBy(desc(eventDeletionLogs.deletedAt)).limit(100);
}

export async function getRecentSubscriptions() {
  return db
    .select({
      id: subscriptions.id,
      email: billingCustomers.email,
      plan: subscriptions.plan,
      status: subscriptions.status,
      lastPaymentStatus: subscriptions.lastPaymentStatus,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(
      billingCustomers,
      eq(subscriptions.billingCustomerId, billingCustomers.id),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(50);
}

export async function getAdminEventTransactions() {
  return db
    .select({
      id: eventTransactions.id,
      eventTitle: events.title,
      payerName: members.name,
      payerEmail: members.email,
      hostName: eventOwners.name,
      grossCents: eventTransactions.grossCents,
      platformFeeCents: eventTransactions.platformFeeCents,
      processingFeeCents: eventTransactions.processingFeeCents,
      customerFeeCents: eventTransactions.customerFeeCents,
      hostNetCents: eventTransactions.hostNetCents,
      currency: eventTransactions.currency,
      status: eventTransactions.status,
      stripeCheckoutSessionId: eventTransactions.stripeCheckoutSessionId,
      paidAt: eventTransactions.paidAt,
    })
    .from(eventTransactions)
    .innerJoin(events, eq(eventTransactions.eventId, events.id))
    .leftJoin(members, eq(eventTransactions.memberId, members.id))
    .leftJoin(eventOwners, eq(eventTransactions.hostMemberId, eventOwners.id))
    .orderBy(desc(eventTransactions.paidAt))
    .limit(250);
}

export async function getHostEventTransactions(memberId: string) {
  return db
    .select({
      id: eventTransactions.id,
      eventId: events.id,
      eventTitle: events.title,
      payerName: members.name,
      participationId: eventParticipations.id,
      pathType: eventParticipations.pathType,
      accommodationType: eventParticipations.accommodationType,
      accommodationPriceCents: eventParticipations.accommodationPriceCents,
      grossCents: eventTransactions.grossCents,
      platformFeeCents: eventTransactions.platformFeeCents,
      processingFeeCents: eventTransactions.processingFeeCents,
      customerFeeCents: eventTransactions.customerFeeCents,
      hostNetCents: eventTransactions.hostNetCents,
      status: eventTransactions.status,
      confirmationCode: eventTransactions.confirmationCode,
      stripePaymentIntentId: eventTransactions.stripePaymentIntentId,
      paidAt: eventTransactions.paidAt,
    })
    .from(eventTransactions)
    .innerJoin(events, eq(eventTransactions.eventId, events.id))
    .leftJoin(members, eq(eventTransactions.memberId, members.id))
    .leftJoin(eventParticipations, eq(eventTransactions.participationId, eventParticipations.id))
    .where(and(eq(eventTransactions.hostMemberId, memberId), eq(eventTransactions.status, "paid")))
    .orderBy(desc(eventTransactions.paidAt))
    .limit(100);
}

export async function getMemberEventTransactions(memberId: string) {
  return db
    .select({
      id: eventTransactions.id,
      eventTitle: events.title,
      eventSlug: events.slug,
      pathType: eventParticipations.pathType,
      accommodationType: eventParticipations.accommodationType,
      accommodationPriceCents: eventParticipations.accommodationPriceCents,
      grossCents: eventTransactions.grossCents,
      platformFeeCents: eventTransactions.platformFeeCents,
      processingFeeCents: eventTransactions.processingFeeCents,
      customerFeeCents: eventTransactions.customerFeeCents,
      hostNetCents: eventTransactions.hostNetCents,
      currency: eventTransactions.currency,
      status: eventTransactions.status,
      stripePaymentIntentId: eventTransactions.stripePaymentIntentId,
      confirmationCode: eventTransactions.confirmationCode,
      paidAt: eventTransactions.paidAt,
    })
    .from(eventTransactions)
    .innerJoin(events, eq(eventTransactions.eventId, events.id))
    .leftJoin(eventParticipations, eq(eventTransactions.participationId, eventParticipations.id))
    .where(eq(eventTransactions.memberId, memberId))
    .orderBy(desc(eventTransactions.paidAt))
    .limit(100);
}

export async function getMemberPaidEventParticipation(eventId: string, memberId: string) {
  const [row] = await db
    .select({
      participationId: eventParticipations.id,
      pathType: eventParticipations.pathType,
      transactionId: eventTransactions.id,
      confirmationCode: eventTransactions.confirmationCode,
      paidAt: eventTransactions.paidAt,
    })
    .from(eventParticipations)
    .innerJoin(eventTransactions, eq(eventTransactions.participationId, eventParticipations.id))
    .where(and(
      eq(eventParticipations.eventId, eventId),
      eq(eventParticipations.memberId, memberId),
      eq(eventTransactions.status, "paid"),
      eq(eventParticipations.status, "confirmed"),
    ))
    .orderBy(desc(eventTransactions.paidAt))
    .limit(1);
  return row ?? null;
}

export async function getMemberEventTransactionReceipt(transactionId: string, memberId: string) {
  const [row] = await db
    .select({
      id: eventTransactions.id,
      participationId: eventParticipations.id,
      checkInToken: eventParticipations.checkInToken,
      eventTitle: events.title,
      eventSlug: events.slug,
      eventLocation: events.location,
      eventStartsAt: events.startsAt,
      pathType: eventParticipations.pathType,
      accommodationType: eventParticipations.accommodationType,
      accommodationPriceCents: eventParticipations.accommodationPriceCents,
      payerName: members.name,
      payerEmail: members.email,
      hostName: eventOwners.name,
      grossCents: eventTransactions.grossCents,
      platformFeeCents: eventTransactions.platformFeeCents,
      processingFeeCents: eventTransactions.processingFeeCents,
      customerFeeCents: eventTransactions.customerFeeCents,
      hostNetCents: eventTransactions.hostNetCents,
      currency: eventTransactions.currency,
      status: eventTransactions.status,
      stripePaymentIntentId: eventTransactions.stripePaymentIntentId,
      confirmationCode: eventTransactions.confirmationCode,
      paidAt: eventTransactions.paidAt,
    })
    .from(eventTransactions)
    .innerJoin(events, eq(eventTransactions.eventId, events.id))
    .leftJoin(eventParticipations, eq(eventTransactions.participationId, eventParticipations.id))
    .leftJoin(members, eq(eventTransactions.memberId, members.id))
    .leftJoin(eventOwners, eq(eventTransactions.hostMemberId, eventOwners.id))
    .where(and(eq(eventTransactions.id, transactionId), eq(eventTransactions.memberId, memberId)))
    .limit(1);
  return row ?? null;
}

export async function getMemberSubscription(memberId: string, email: string) {
  const [account] = await db
    .select({
      tierOverride: members.membershipTierOverride,
      subscriptionExempt: members.subscriptionExempt,
    })
    .from(members)
    .where(and(eq(members.id, memberId), isNull(members.deletedAt)))
    .limit(1);
  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      lastPaymentStatus: subscriptions.lastPaymentStatus,
    })
    .from(subscriptions)
    .innerJoin(
      billingCustomers,
      eq(subscriptions.billingCustomerId, billingCustomers.id),
    )
    .where(
      or(
        eq(billingCustomers.memberId, memberId),
        eq(billingCustomers.email, email),
      ),
    )
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  if (account?.tierOverride && account.tierOverride !== "none") {
    if (subscription && !account.subscriptionExempt) {
      return { ...subscription, plan: account.tierOverride, adminManaged: false };
    }
    if (!account.subscriptionExempt) return null;
    return {
      plan: account.tierOverride,
      status: "payment exempt",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      lastPaymentStatus: "not required",
      adminManaged: true,
    };
  }
  return subscription ? { ...subscription, adminManaged: false } : null;
}

export async function getAdminUsers() {
  return db
    .select({
      id: members.id,
      name: members.name,
      username: members.username,
      email: members.email,
      role: members.primaryRole,
      market: members.homeMarket,
      countryCode: members.countryCode,
      stateCode: members.stateCode,
      city: members.city,
      tier: sql<string | null>`coalesce(
        ${members.membershipTierOverride},
        (
          select ${subscriptions.plan}
          from ${subscriptions}
          inner join ${billingCustomers}
            on ${subscriptions.billingCustomerId} = ${billingCustomers.id}
          where ${billingCustomers.memberId} = ${members.id}
          order by ${subscriptions.updatedAt} desc
          limit 1
        ),
        ${profiles.membershipTier}
      )`,
      tierOverride: members.membershipTierOverride,
      subscriptionExempt: members.subscriptionExempt,
      avatarUpdatedAt: members.avatarUpdatedAt,
      profileImagePath: profiles.imagePath,
      verifiedAt: members.emailVerifiedAt,
      adminApprovedAt: members.adminApprovedAt,
      adminApprovalDeniedAt: members.adminApprovalDeniedAt,
      organization: members.organization,
      bio: members.bio,
      phone: members.phone,
      websiteUrl: members.websiteUrl,
      portfolioUrl: members.portfolioUrl,
      profileSlug: profiles.slug,
      profileBio: profiles.bio,
      experienceYears: profiles.experienceYears,
      height: profiles.height,
      measurements: profiles.measurements,
      hairColor: profiles.hairColor,
      eyeColor: profiles.eyeColor,
      specialties: profiles.specialties,
      xUrl: profiles.xUrl,
      instagramUrl: profiles.instagramUrl,
      youtubeUrl: profiles.youtubeUrl,
      onlyfansUrl: profiles.onlyfansUrl,
      customUrl: profiles.customUrl,
      isAvailable: profiles.isAvailable,
      isPublished: profiles.isPublished,
      identityStatus: members.identityVerificationStatus,
      identityReviewNotes: members.identityReviewNotes,
      identityDocumentId: identityDocuments.id,
      identityDocumentType: identityDocuments.documentType,
      identityLegalName: identityDocuments.legalName,
      identityIssuingCountry: identityDocuments.issuingCountry,
      identityExpiresOn: identityDocuments.expiresOn,
      identityHasBack: isNotNull(identityDocuments.backData),
      identityHasSelfie: isNotNull(identityDocuments.selfieData),
      lastActiveAt: members.lastActiveAt,
      accountDeletionScheduledAt: members.accountDeletionScheduledAt,
      updatedAt: members.updatedAt,
    })
    .from(members)
    .leftJoin(profiles, eq(profiles.memberId, members.id))
    .leftJoin(identityDocuments, eq(identityDocuments.memberId, members.id))
    .where(isNull(members.deletedAt))
    .orderBy(desc(members.updatedAt));
}

export async function getAdminMemberMessages() {
  const [requests, threadMessages] = await Promise.all([
    db
      .select({
        id: collaborationRequests.id,
        requestId: collaborationRequests.id,
        senderId: collaborationRequests.senderMemberId,
        senderName: collaborationSenders.name,
        senderRole: collaborationSenders.primaryRole,
        senderUsername: collaborationSenders.username,
        senderAvatarUpdatedAt: collaborationSenders.avatarUpdatedAt,
        senderProfileSlug: collaborationSenderProfiles.slug,
        senderImagePath: collaborationSenderProfiles.imagePath,
        recipientId: collaborationRequests.recipientMemberId,
        recipientName: collaborationRecipients.name,
        recipientRole: collaborationRecipients.primaryRole,
        recipientUsername: collaborationRecipients.username,
        recipientAvatarUpdatedAt: collaborationRecipients.avatarUpdatedAt,
        recipientProfileSlug: collaborationRecipientProfiles.slug,
        recipientImagePath: collaborationRecipientProfiles.imagePath,
        subject: collaborationRequests.subject,
        body: collaborationRequests.message,
        createdAt: collaborationRequests.createdAt,
        messageKind: sql<"initial">`'initial'`,
      })
      .from(collaborationRequests)
      .innerJoin(collaborationSenders, eq(collaborationRequests.senderMemberId, collaborationSenders.id))
      .innerJoin(collaborationRecipients, eq(collaborationRequests.recipientMemberId, collaborationRecipients.id))
      .leftJoin(collaborationSenderProfiles, eq(collaborationSenderProfiles.memberId, collaborationSenders.id))
      .leftJoin(collaborationRecipientProfiles, eq(collaborationRecipientProfiles.memberId, collaborationRecipients.id)),
    db
      .select({
        id: collaborationMessages.id,
        requestId: collaborationMessages.requestId,
        senderId: collaborationMessages.senderMemberId,
        senderName: messageAuthors.name,
        requestSenderId: collaborationRequests.senderMemberId,
        requestSenderName: collaborationSenders.name,
        requestSenderRole: collaborationSenders.primaryRole,
        requestSenderUsername: collaborationSenders.username,
        requestSenderAvatarUpdatedAt: collaborationSenders.avatarUpdatedAt,
        requestSenderProfileSlug: collaborationSenderProfiles.slug,
        requestSenderImagePath: collaborationSenderProfiles.imagePath,
        requestRecipientId: collaborationRequests.recipientMemberId,
        requestRecipientName: collaborationRecipients.name,
        requestRecipientRole: collaborationRecipients.primaryRole,
        requestRecipientUsername: collaborationRecipients.username,
        requestRecipientAvatarUpdatedAt: collaborationRecipients.avatarUpdatedAt,
        requestRecipientProfileSlug: collaborationRecipientProfiles.slug,
        requestRecipientImagePath: collaborationRecipientProfiles.imagePath,
        subject: collaborationRequests.subject,
        body: collaborationMessages.body,
        createdAt: collaborationMessages.createdAt,
      })
      .from(collaborationMessages)
      .innerJoin(collaborationRequests, eq(collaborationMessages.requestId, collaborationRequests.id))
      .innerJoin(messageAuthors, eq(collaborationMessages.senderMemberId, messageAuthors.id))
      .innerJoin(collaborationSenders, eq(collaborationRequests.senderMemberId, collaborationSenders.id))
      .innerJoin(collaborationRecipients, eq(collaborationRequests.recipientMemberId, collaborationRecipients.id))
      .leftJoin(collaborationSenderProfiles, eq(collaborationSenderProfiles.memberId, collaborationSenders.id))
      .leftJoin(collaborationRecipientProfiles, eq(collaborationRecipientProfiles.memberId, collaborationRecipients.id)),
  ]);
  return [
    ...requests,
    ...threadMessages.map((message) => ({
      id: message.id,
      requestId: message.requestId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderId === message.requestSenderId
        ? message.requestSenderRole
        : message.requestRecipientRole,
      senderUsername: message.senderId === message.requestSenderId
        ? message.requestSenderUsername
        : message.requestRecipientUsername,
      senderProfileSlug: message.senderId === message.requestSenderId
        ? message.requestSenderProfileSlug
        : message.requestRecipientProfileSlug,
      recipientId: message.senderId === message.requestSenderId
        ? message.requestRecipientId
        : message.requestSenderId,
      recipientName: message.senderId === message.requestSenderId
        ? message.requestRecipientName
        : message.requestSenderName,
      recipientRole: message.senderId === message.requestSenderId
        ? message.requestRecipientRole
        : message.requestSenderRole,
      recipientUsername: message.senderId === message.requestSenderId
        ? message.requestRecipientUsername
        : message.requestSenderUsername,
      recipientProfileSlug: message.senderId === message.requestSenderId
        ? message.requestRecipientProfileSlug
        : message.requestSenderProfileSlug,
      senderAvatarUpdatedAt: message.senderId === message.requestSenderId
        ? message.requestSenderAvatarUpdatedAt
        : message.requestRecipientAvatarUpdatedAt,
      senderImagePath: message.senderId === message.requestSenderId
        ? message.requestSenderImagePath
        : message.requestRecipientImagePath,
      recipientAvatarUpdatedAt: message.senderId === message.requestSenderId
        ? message.requestRecipientAvatarUpdatedAt
        : message.requestSenderAvatarUpdatedAt,
      recipientImagePath: message.senderId === message.requestSenderId
        ? message.requestRecipientImagePath
        : message.requestSenderImagePath,
      subject: message.subject,
      body: message.body,
      createdAt: message.createdAt,
      messageKind: "reply" as const,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getIdentityAuditLogs() {
  return db
    .select({
      id: identityAuditLogs.id,
      memberName: members.name,
      action: identityAuditLogs.action,
      detail: identityAuditLogs.detail,
      createdAt: identityAuditLogs.createdAt,
    })
    .from(identityAuditLogs)
    .leftJoin(members, eq(identityAuditLogs.memberId, members.id))
    .orderBy(desc(identityAuditLogs.createdAt))
    .limit(100);
}

export async function getAdminEvents() {
  return db.select(eventPublicFields).from(events).orderBy(desc(events.updatedAt), asc(events.startsAt));
}

export async function getSponsors() {
  return db.select().from(sponsors).where(eq(sponsors.isActive, true)).orderBy(asc(sponsors.name));
}

export async function getAdminSponsorshipRequests() {
  return db
    .select({
      id: sponsorshipRequests.id,
      requesterMemberId: sponsorshipRequests.requesterMemberId,
      responseMemberId: sponsorshipRequests.responseMemberId,
      eventTitle: events.title,
      sponsorName: sponsors.name,
      sponsorId: sponsors.id,
      hasLogoUpload: sql<boolean>`${sponsors.logoData} is not null`,
      logoFilename: sponsors.logoFilename,
      direction: sponsorshipRequests.direction,
      status: sponsorshipRequests.status,
      message: sponsorshipRequests.message,
      contributionType: sponsorshipRequests.contributionType,
      cashAmountCents: sponsorshipRequests.cashAmountCents,
      offerDetails: sponsorshipRequests.offerDetails,
      flightIncluded: sponsorshipRequests.flightIncluded,
      hotelIncluded: sponsorshipRequests.hotelIncluded,
      representationRequired: sponsorshipRequests.representationRequired,
      representationTerms: sponsorshipRequests.representationTerms,
      targetName: sponsorshipTargets.name,
      createdAt: sponsorshipRequests.createdAt,
    })
    .from(sponsorshipRequests)
    .innerJoin(events, eq(sponsorshipRequests.eventId, events.id))
    .innerJoin(sponsors, eq(sponsorshipRequests.sponsorId, sponsors.id))
    .leftJoin(sponsorshipTargets, eq(sponsorshipRequests.targetMemberId, sponsorshipTargets.id))
    .orderBy(desc(sponsorshipRequests.createdAt));
}

export async function getEventParticipationsForMember(memberId: string) {
  return db
    .select({
      id: eventParticipations.id,
      eventId: events.id,
      eventPublished: events.isPublished,
      eventTitle: events.title,
      eventSlug: events.slug,
      pathType: eventParticipations.pathType,
      status: eventParticipations.status,
      priceCents: eventParticipations.priceCents,
      eventLocation: events.location,
      eventStartsAt: events.startsAt,
      eventEndsAt: events.endsAt,
      accommodationType: eventParticipations.accommodationType,
      accommodationPriceCents: eventParticipations.accommodationPriceCents,
      confirmationCode: eventTransactions.confirmationCode,
      transactionId: eventTransactions.id,
      transactionStatus: eventTransactions.status,
      grossCents: eventTransactions.grossCents,
      customerFeeCents: eventTransactions.customerFeeCents,
      hostNetCents: eventTransactions.hostNetCents,
      paidAt: eventTransactions.paidAt,
      createdAt: eventParticipations.createdAt,
    })
    .from(eventParticipations)
    .innerJoin(events, eq(eventParticipations.eventId, events.id))
    .leftJoin(eventTransactions, eq(eventTransactions.participationId, eventParticipations.id))
    .where(eq(eventParticipations.memberId, memberId))
    .orderBy(desc(eventParticipations.createdAt));
}

export async function getHostedEvents(memberId: string) {
  return db
    .select(eventPublicFields)
    .from(events)
    .where(eq(events.ownerId, memberId))
    .orderBy(desc(events.startsAt));
}

export async function getEventProposalsForMember(memberId: string) {
  return db
    .select({
      id: eventProposals.id,
      title: eventProposals.title,
      eventType: eventProposals.eventType,
      location: eventProposals.location,
      timing: eventProposals.timing,
      status: eventProposals.status,
      eventId: eventProposals.eventId,
      rejectionReason: eventProposals.rejectionReason,
      createdAt: eventProposals.createdAt,
      updatedAt: eventProposals.updatedAt,
    })
    .from(eventProposals)
    .where(eq(eventProposals.memberId, memberId))
    .orderBy(desc(eventProposals.updatedAt));
}

export async function getHostedParticipationRequests(memberId: string) {
  return db
    .select({
      id: eventParticipations.id,
      eventId: events.id,
      eventTitle: events.title,
      eventSlug: events.slug,
      eventStartsAt: events.startsAt,
      eventLocation: events.location,
      pathType: eventParticipations.pathType,
      status: eventParticipations.status,
      applicantName: eventParticipations.applicantName,
      applicantEmail: eventParticipations.applicantEmail,
      applicantMemberId: members.id,
      applicantProfileSlug: profiles.slug,
      applicantImagePath: profiles.imagePath,
      applicantAvatarUpdatedAt: members.avatarUpdatedAt,
      note: eventParticipations.note,
      withdrawalReason: eventParticipations.withdrawalReason,
      withdrawnAt: eventParticipations.withdrawnAt,
      priceCents: eventParticipations.priceCents,
      accommodationType: eventParticipations.accommodationType,
      accommodationPriceCents: eventParticipations.accommodationPriceCents,
      confirmationEmailSentAt: eventParticipations.confirmationEmailSentAt,
      transactionId: eventTransactions.id,
      stripePaymentIntentId: eventTransactions.stripePaymentIntentId,
      confirmationCode: eventTransactions.confirmationCode,
      transactionStatus: eventTransactions.status,
      grossCents: eventTransactions.grossCents,
      customerFeeCents: eventTransactions.customerFeeCents,
      hostNetCents: eventTransactions.hostNetCents,
      currency: eventTransactions.currency,
      paidAt: eventTransactions.paidAt,
      createdAt: eventParticipations.createdAt,
      updatedAt: eventParticipations.updatedAt,
    })
    .from(eventParticipations)
    .innerJoin(events, eq(eventParticipations.eventId, events.id))
    .innerJoin(members, eq(eventParticipations.memberId, members.id))
    .leftJoin(profiles, eq(eventParticipations.memberId, profiles.memberId))
    .leftJoin(eventTransactions, eq(eventTransactions.participationId, eventParticipations.id))
    .where(eq(events.ownerId, memberId))
    .orderBy(desc(eventParticipations.createdAt));
}

export async function getDashboardProfile(memberId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.memberId, memberId))
    .limit(1);
  if (!profile) return null;
  const portfolio = await db
    .select({
      id: portfolioItems.id,
      imagePath: portfolioItems.imagePath,
      caption: portfolioItems.caption,
      credit: portfolioItems.credit,
      sortOrder: portfolioItems.sortOrder,
      isPublished: portfolioItems.isPublished,
      isPrivate: portfolioItems.isPrivate,
      hasImageData: sql<boolean>`${portfolioItems.imageData} is not null`,
      createdAt: portfolioItems.createdAt,
    })
    .from(portfolioItems)
    .where(eq(portfolioItems.profileId, profile.id))
    .orderBy(asc(portfolioItems.sortOrder));
  return { profile, portfolio };
}

export async function getSponsorForMember(memberId: string) {
  const [row] = await db
    .select({
      id: sponsors.id,
      slug: sponsors.slug,
      name: sponsors.name,
      category: sponsors.category,
      logoPath: sponsors.logoPath,
      hasLogoUpload: sql<boolean>`${sponsors.logoData} is not null`,
      logoFilename: sponsors.logoFilename,
      websiteUrl: sponsors.websiteUrl,
      contactEmail: sponsors.contactEmail,
      contactName: sponsors.contactName,
      contactPhone: sponsors.contactPhone,
      description: sponsors.description,
      location: sponsors.location,
      sponsorLevel: sponsors.sponsorLevel,
      preferredPlacement: sponsors.preferredPlacement,
      preferredLogoSize: sponsors.preferredLogoSize,
      brandGuidelines: sponsors.brandGuidelines,
      logoUsageApproved: sponsors.logoUsageApproved,
      sponsorshipStartsOn: sponsors.sponsorshipStartsOn,
      sponsorshipEndsOn: sponsors.sponsorshipEndsOn,
      requiredWording: sponsors.requiredWording,
      trackingUrl: sponsors.trackingUrl,
      permission: sponsorMembers.permission,
    })
    .from(sponsorMembers)
    .innerJoin(sponsors, eq(sponsorMembers.sponsorId, sponsors.id))
    .where(eq(sponsorMembers.memberId, memberId))
    .limit(1);
  return row ?? null;
}

export async function getSponsorshipRequestsForMember(memberId: string) {
  const sponsor = await getSponsorForMember(memberId);
  if (!sponsor) return [];
  return db
    .select({
      id: sponsorshipRequests.id,
      requesterMemberId: sponsorshipRequests.requesterMemberId,
      responseMemberId: sponsorshipRequests.responseMemberId,
      eventId: events.id,
      eventTitle: events.title,
      eventSlug: events.slug,
      hostEmail: eventOwners.email,
      direction: sponsorshipRequests.direction,
      message: sponsorshipRequests.message,
      contributionType: sponsorshipRequests.contributionType,
      cashAmountCents: sponsorshipRequests.cashAmountCents,
      offerDetails: sponsorshipRequests.offerDetails,
      flightIncluded: sponsorshipRequests.flightIncluded,
      hotelIncluded: sponsorshipRequests.hotelIncluded,
      representationRequired: sponsorshipRequests.representationRequired,
      representationTerms: sponsorshipRequests.representationTerms,
      targetName: sponsorshipTargets.name,
      status: sponsorshipRequests.status,
      agreementId: sponsorshipAgreements.id,
      createdAt: sponsorshipRequests.createdAt,
    })
    .from(sponsorshipRequests)
    .innerJoin(events, eq(sponsorshipRequests.eventId, events.id))
    .leftJoin(eventOwners, eq(events.ownerId, eventOwners.id))
    .leftJoin(sponsorshipAgreements, eq(sponsorshipAgreements.requestId, sponsorshipRequests.id))
    .leftJoin(sponsorshipTargets, eq(sponsorshipRequests.targetMemberId, sponsorshipTargets.id))
    .where(eq(sponsorshipRequests.sponsorId, sponsor.id))
    .orderBy(desc(sponsorshipRequests.createdAt));
}

export async function getMemberSponsorshipOffers(memberId: string) {
  return db
    .select({
      id: sponsorshipRequests.id,
      requesterMemberId: sponsorshipRequests.requesterMemberId,
      responseMemberId: sponsorshipRequests.responseMemberId,
      eventTitle: events.title,
      eventSlug: events.slug,
      sponsorName: sponsors.name,
      status: sponsorshipRequests.status,
      message: sponsorshipRequests.message,
      contributionType: sponsorshipRequests.contributionType,
      cashAmountCents: sponsorshipRequests.cashAmountCents,
      offerDetails: sponsorshipRequests.offerDetails,
      flightIncluded: sponsorshipRequests.flightIncluded,
      hotelIncluded: sponsorshipRequests.hotelIncluded,
      representationRequired: sponsorshipRequests.representationRequired,
      representationTerms: sponsorshipRequests.representationTerms,
      agreementId: sponsorshipAgreements.id,
      createdAt: sponsorshipRequests.createdAt,
    })
    .from(sponsorshipRequests)
    .innerJoin(events, eq(sponsorshipRequests.eventId, events.id))
    .innerJoin(sponsors, eq(sponsorshipRequests.sponsorId, sponsors.id))
    .leftJoin(sponsorshipAgreements, eq(sponsorshipAgreements.requestId, sponsorshipRequests.id))
    .where(eq(sponsorshipRequests.targetMemberId, memberId))
    .orderBy(desc(sponsorshipRequests.createdAt));
}

export async function getHostedSponsorshipRequests(memberId: string) {
  return db
    .select({
      id: sponsorshipRequests.id,
      requesterMemberId: sponsorshipRequests.requesterMemberId,
      responseMemberId: sponsorshipRequests.responseMemberId,
      eventId: events.id,
      eventTitle: events.title,
      eventSlug: events.slug,
      sponsorName: sponsors.name,
      sponsorId: sponsors.id,
      hasLogoUpload: sql<boolean>`${sponsors.logoData} is not null`,
      logoFilename: sponsors.logoFilename,
      direction: sponsorshipRequests.direction,
      message: sponsorshipRequests.message,
      cashAmountCents: sponsorshipRequests.cashAmountCents,
      flightIncluded: sponsorshipRequests.flightIncluded,
      hotelIncluded: sponsorshipRequests.hotelIncluded,
      representationRequired: sponsorshipRequests.representationRequired,
      targetName: sponsorshipTargets.name,
      status: sponsorshipRequests.status,
      agreementId: sponsorshipAgreements.id,
      createdAt: sponsorshipRequests.createdAt,
    })
    .from(sponsorshipRequests)
    .innerJoin(events, eq(sponsorshipRequests.eventId, events.id))
    .innerJoin(sponsors, eq(sponsorshipRequests.sponsorId, sponsors.id))
    .leftJoin(sponsorshipAgreements, eq(sponsorshipAgreements.requestId, sponsorshipRequests.id))
    .leftJoin(sponsorshipTargets, eq(sponsorshipRequests.targetMemberId, sponsorshipTargets.id))
    .where(eq(events.ownerId, memberId))
    .orderBy(desc(sponsorshipRequests.createdAt));
}

export async function getSponsoredEventsForMember(memberId: string) {
  const sponsor = await getSponsorForMember(memberId);
  if (!sponsor) return [];
  return db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      location: events.location,
      startsAt: events.startsAt,
      level: eventSponsors.level,
      contribution: eventSponsors.contribution,
    })
    .from(eventSponsors)
    .innerJoin(events, eq(eventSponsors.eventId, events.id))
    .where(eq(eventSponsors.sponsorId, sponsor.id))
    .orderBy(asc(events.startsAt));
}

export async function getCollaborationInbox(memberId: string) {
  return db
    .select({
      id: collaborationRequests.id,
      senderName: collaborationSenders.name,
      senderRole: collaborationSenders.primaryRole,
      senderMemberId: collaborationSenders.id,
      kind: collaborationRequests.kind,
      subject: collaborationRequests.subject,
      message: collaborationRequests.message,
      status: collaborationRequests.status,
      eventTitle: events.title,
      eventSlug: events.slug,
      createdAt: collaborationRequests.createdAt,
      updatedAt: collaborationRequests.updatedAt,
    })
    .from(collaborationRequests)
    .innerJoin(
      collaborationSenders,
      eq(collaborationRequests.senderMemberId, collaborationSenders.id),
    )
    .leftJoin(events, eq(collaborationRequests.eventId, events.id))
    .where(
      and(
        eq(collaborationRequests.recipientMemberId, memberId),
        isNull(collaborationRequests.recipientHiddenAt),
      ),
    )
    .orderBy(desc(collaborationRequests.createdAt));
}

export async function getCollaborationOutbox(memberId: string) {
  return db
    .select({
      id: collaborationRequests.id,
      recipientName: collaborationRecipients.name,
      recipientRole: collaborationRecipients.primaryRole,
      recipientMemberId: collaborationRecipients.id,
      kind: collaborationRequests.kind,
      subject: collaborationRequests.subject,
      message: collaborationRequests.message,
      status: collaborationRequests.status,
      eventTitle: events.title,
      eventSlug: events.slug,
      createdAt: collaborationRequests.createdAt,
      updatedAt: collaborationRequests.updatedAt,
    })
    .from(collaborationRequests)
    .innerJoin(
      collaborationRecipients,
      eq(collaborationRequests.recipientMemberId, collaborationRecipients.id),
    )
    .leftJoin(events, eq(collaborationRequests.eventId, events.id))
    .where(
      and(
        eq(collaborationRequests.senderMemberId, memberId),
        isNull(collaborationRequests.senderHiddenAt),
      ),
    )
    .orderBy(desc(collaborationRequests.createdAt));
}

export async function getDeletedCollaborationOutbox(memberId: string) {
  return db
    .select({
      id: collaborationRequests.id,
      recipientName: collaborationRecipients.name,
      recipientRole: collaborationRecipients.primaryRole,
      recipientMemberId: collaborationRecipients.id,
      subject: collaborationRequests.subject,
      status: collaborationRequests.status,
      eventTitle: events.title,
      deletedAt: collaborationRequests.senderHiddenAt,
      purgeAt: sql<Date>`${collaborationRequests.senderHiddenAt} + interval '30 days'`,
    })
    .from(collaborationRequests)
    .innerJoin(
      collaborationRecipients,
      eq(collaborationRequests.recipientMemberId, collaborationRecipients.id),
    )
    .leftJoin(events, eq(collaborationRequests.eventId, events.id))
    .where(
      and(
        eq(collaborationRequests.senderMemberId, memberId),
        eq(collaborationRequests.status, "declined"),
        isNotNull(collaborationRequests.senderHiddenAt),
        sql`${collaborationRequests.senderHiddenAt} > now() - interval '30 days'`,
      ),
    )
    .orderBy(desc(collaborationRequests.senderHiddenAt));
}

export async function getCollaborationMessagesForMember(memberId: string) {
  return db
    .select({
      id: collaborationMessages.id,
      requestId: collaborationMessages.requestId,
      senderMemberId: collaborationMessages.senderMemberId,
      senderName: members.name,
      body: collaborationMessages.body,
      createdAt: collaborationMessages.createdAt,
    })
    .from(collaborationMessages)
    .innerJoin(
      collaborationRequests,
      eq(collaborationMessages.requestId, collaborationRequests.id),
    )
    .innerJoin(members, eq(collaborationMessages.senderMemberId, members.id))
    .where(
      or(
        and(
          eq(collaborationRequests.senderMemberId, memberId),
          isNull(collaborationRequests.senderHiddenAt),
        ),
        and(
          eq(collaborationRequests.recipientMemberId, memberId),
          isNull(collaborationRequests.recipientHiddenAt),
        ),
      ),
    )
    .orderBy(asc(collaborationMessages.createdAt));
}

export async function getInviteCooldowns(senderMemberId: string, recipientMemberId: string) {
  return db
    .select({
      eventId: collaborationRequests.eventId,
      retryAt: sql<Date>`${collaborationRequests.createdAt} + interval '12 hours'`,
    })
    .from(collaborationRequests)
    .where(
      and(
        eq(collaborationRequests.senderMemberId, senderMemberId),
        eq(collaborationRequests.recipientMemberId, recipientMemberId),
        eq(collaborationRequests.kind, "event_invite"),
        sql`${collaborationRequests.createdAt} > now() - interval '12 hours'`,
      ),
    )
    .orderBy(desc(collaborationRequests.createdAt));
}

export async function getSuggestedCollaborators(memberId: string) {
  return db
    .select({
      id: members.id,
      name: members.name,
      role: members.primaryRole,
      market: members.homeMarket,
      profileSlug: profiles.slug,
    })
    .from(members)
    .leftJoin(profiles, eq(profiles.memberId, members.id))
    .where(isNotNull(members.emailVerifiedAt))
    .orderBy(desc(members.updatedAt))
    .limit(16)
    .then((rows) => rows.filter((row) => row.id !== memberId).slice(0, 8));
}
