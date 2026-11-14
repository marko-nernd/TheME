import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { EventTravelDetails } from "@/lib/event-travel-fields";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const memberRole = pgEnum("member_role", ["model", "photographer"]);
export const proposalRole = pgEnum("proposal_role", [
  "host",
  "model",
  "photographer",
  "sponsor",
]);
export const proposalStatus = pgEnum("proposal_status", ["submitted", "reviewing", "approved", "declined", "rejected", "deleted"]);
export const participationStatus = pgEnum("participation_status", [
  "pending",
  "approved",
  "awaiting_payment",
  "confirmed",
  "declined",
  "cancelled",
  "refunded",
]);

export type EventParticipationPath = {
  type: "model" | "photographer" | "sponsor" | "attendee";
  enabled: boolean;
  title: string;
  description: string;
  priceCents: number;
  capacity: number;
  approvalRequired: boolean;
};

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    username: text("username"),
    profileIdentityChangesUsed: integer("profile_identity_changes_used").notNull().default(0),
    profileCredits: integer("profile_credits").notNull().default(0),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    primaryRole: proposalRole("primary_role").notNull(),
    homeMarket: text("home_market").notNull(),
    countryCode: text("country_code"),
    stateCode: text("state_code"),
    city: text("city"),
    organization: text("organization"),
    bio: text("bio").notNull().default(""),
    phone: text("phone"),
    websiteUrl: text("website_url"),
    portfolioUrl: text("portfolio_url"),
    cameraBrand: text("camera_brand"),
    avatarSource: text("avatar_source").notNull().default("upload"),
    socialAvatarData: bytea("social_avatar_data"),
    socialAvatarProvider: text("social_avatar_provider"),
    socialAvatarHandle: text("social_avatar_handle"),
    avatarData: bytea("avatar_data"),
    avatarMime: text("avatar_mime"),
    avatarUpdatedAt: timestamp("avatar_updated_at", { withTimezone: true }),
    identityVerificationStatus: text("identity_verification_status").notNull().default("not_submitted"),
    identityVerifiedAt: timestamp("identity_verified_at", { withTimezone: true }),
    identityReviewNotes: text("identity_review_notes"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    adminApprovedAt: timestamp("admin_approved_at", { withTimezone: true }),
    adminApprovalDeniedAt: timestamp("admin_approval_denied_at", { withTimezone: true }),
    membershipTierOverride: text("membership_tier_override"),
    subscriptionExempt: boolean("subscription_exempt").notNull().default(false),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
    inactivityReminderSentAt: timestamp("inactivity_reminder_sent_at", { withTimezone: true }),
    finalWarningSentAt: timestamp("final_warning_sent_at", { withTimezone: true }),
    accountDeletionScheduledAt: timestamp("account_deletion_scheduled_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("members_email_unique").on(table.email),
    uniqueIndex("members_username_unique").on(table.username),
  ],
);

export const identityDocuments = pgTable(
  "identity_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    legalName: text("legal_name").notNull(),
    issuingCountry: text("issuing_country").notNull(),
    expiresOn: text("expires_on").notNull(),
    frontData: bytea("front_data").notNull(),
    frontMime: text("front_mime").notNull(),
    backData: bytea("back_data"),
    backMime: text("back_mime"),
    selfieData: bytea("selfie_data"),
    selfieMime: text("selfie_mime"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("identity_documents_member_unique").on(table.memberId),
    index("identity_documents_type_idx").on(table.documentType),
  ],
);

export const identityAuditLogs = pgTable(
  "identity_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    adminId: uuid("admin_id"),
    action: text("action").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("identity_audit_member_created_idx").on(table.memberId, table.createdAt),
    index("identity_audit_action_idx").on(table.action),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").references(() => adminAccounts.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    beforeData: jsonb("before_data").$type<Record<string, unknown> | null>(),
    afterData: jsonb("after_data").$type<Record<string, unknown> | null>(),
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_resource_created_idx").on(table.resourceType, table.resourceId, table.createdAt),
    index("admin_audit_admin_created_idx").on(table.adminId, table.createdAt),
  ],
);

export const memberNotifications = pgTable(
  "member_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    href: text("href"),
    resourceId: uuid("resource_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("member_notifications_member_created_idx").on(table.memberId, table.createdAt),
    index("member_notifications_member_unread_idx").on(table.memberId, table.readAt),
    index("member_notifications_resource_idx").on(table.resourceId),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    role: memberRole("role").notNull(),
    location: text("location").notNull(),
    imagePath: text("image_path").notNull(),
    coverData: bytea("cover_data"),
    coverMime: text("cover_mime"),
    bio: text("bio").notNull().default(""),
    membershipTier: text("membership_tier").notNull().default("profile"),
    experienceYears: integer("experience_years").notNull().default(0),
    height: text("height"),
    measurements: text("measurements"),
    bustSize: text("bust_size"),
    waistInches: integer("waist_inches"),
    hipInches: integer("hip_inches"),
    showBustSize: boolean("show_bust_size").notNull().default(true),
    showWaist: boolean("show_waist").notNull().default(true),
    showHips: boolean("show_hips").notNull().default(true),
    hairColor: text("hair_color"),
    eyeColor: text("eye_color"),
    specialties: jsonb("specialties").$type<string[]>().notNull().default([]),
    portfolioUrl: text("portfolio_url"),
    xUrl: text("x_url"),
    instagramUrl: text("instagram_url"),
    youtubeUrl: text("youtube_url"),
    onlyfansUrl: text("onlyfans_url"),
    customUrl: text("custom_url"),
    isPremiumBlur: boolean("is_premium_blur").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("profiles_slug_unique").on(table.slug),
    uniqueIndex("profiles_member_unique").on(table.memberId),
    index("profiles_role_published_idx").on(table.role, table.isPublished),
  ],
);

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    imagePath: text("image_path").notNull(),
    imageData: bytea("image_data"),
    imageMime: text("image_mime"),
    caption: text("caption").notNull().default(""),
    credit: text("credit"),
    isPrivate: boolean("is_private").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("portfolio_profile_image_unique").on(table.profileId, table.imagePath),
    index("portfolio_profile_order_idx").on(table.profileId, table.sortOrder),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").references(() => members.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    location: text("location").notNull(),
    countryCode: text("country_code"),
    stateCode: text("state_code"),
    city: text("city"),
    introSentence: text("intro_sentence").notNull().default(""),
    summary: text("summary").notNull(),
    description: text("description").notNull().default(""),
    imagePath: text("image_path").notNull().default("/images/desert-production.png"),
    mediaType: text("media_type").notNull().default("image"),
    mediaData: bytea("media_data"),
    mediaMime: text("media_mime"),
    posterData: bytea("poster_data"),
    posterMime: text("poster_mime"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    venue: text("venue"),
    externalEventUrl: text("external_event_url"),
    redirectToExternal: boolean("redirect_to_external").notNull().default(false),
    priceCents: integer("price_cents").notNull().default(0),
    refundDaysBefore: integer("refund_days_before").notNull().default(45),
    showRefundNote: boolean("show_refund_note").notNull().default(true),
    flightCostsExcluded: boolean("flight_costs_excluded").notNull().default(true),
    refundTerms: text("refund_terms").notNull().default(""),
    noRefunds: boolean("no_refunds").notNull().default(false),
    passportRequired: boolean("passport_required").notNull().default(false),
    shootTypes: jsonb("shoot_types").$type<string[]>().notNull().default([]),
    participationPaths: jsonb("participation_paths")
      .$type<EventParticipationPath[]>()
      .notNull()
      .default([]),
    accommodationLinks: jsonb("accommodation_links").$type<string[]>().notNull().default([]),
    accommodationDetails: jsonb("accommodation_details").$type<string[]>().notNull().default([]),
    included: jsonb("included").$type<string[]>().notNull().default([]),
    requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
    hotelAvailable: boolean("hotel_available").notNull().default(false),
    hotelPriceCents: integer("hotel_price_cents").notNull().default(0),
    hotelModelsAllowed: boolean("hotel_models_allowed").notNull().default(true),
    hotelPhotographersAllowed: boolean("hotel_photographers_allowed").notNull().default(false),
    villaAvailable: boolean("villa_available").notNull().default(false),
    villaPriceCents: integer("villa_price_cents").notNull().default(0),
    villaModelPriceCents: integer("villa_model_price_cents").notNull().default(0),
    villaPhotographerPriceCents: integer("villa_photographer_price_cents").notNull().default(0),
    villaModelSpots: integer("villa_model_spots").notNull().default(0),
    villaPhotographerSpots: integer("villa_photographer_spots").notNull().default(0),
    villaModelsAllowed: boolean("villa_models_allowed").notNull().default(true),
    villaPhotographersAllowed: boolean("villa_photographers_allowed").notNull().default(false),
    airportInfo: text("airport_info").notNull().default(""),
    travelDetails: jsonb("travel_details").$type<EventTravelDetails>().notNull().default({}),
    flightInstructions: text("flight_instructions").notNull().default(""),
    capacity: integer("capacity").notNull(),
    spotsRemaining: integer("spots_remaining").notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("events_slug_unique").on(table.slug),
    index("events_published_starts_at_idx").on(table.isPublished, table.startsAt),
  ],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("newsletter_email_unique").on(table.email)],
);

export const eventProposals = pgTable(
  "event_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    role: proposalRole("role").notNull(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    organization: text("organization"),
    title: text("title").notNull(),
    eventType: text("event_type").notNull(),
    location: text("location").notNull(),
    countryCode: text("country_code"),
    stateCode: text("state_code"),
    city: text("city"),
    timing: text("timing").notNull(),
    venueStatus: text("venue_status").notNull(),
    externalEventUrl: text("external_event_url"),
    redirectToExternal: boolean("redirect_to_external").notNull().default(false),
    expectedAttendance: integer("expected_attendance").notNull(),
    budgetBand: text("budget_band").notNull(),
    fundingSource: text("funding_source").notNull(),
    supportNeeded: jsonb("support_needed").$type<string[]>().notNull().default([]),
    refundDaysBefore: integer("refund_days_before").notNull().default(45),
    showRefundNote: boolean("show_refund_note").notNull().default(true),
    flightCostsExcluded: boolean("flight_costs_excluded").notNull().default(true),
    refundTerms: text("refund_terms").notNull().default(""),
    noRefunds: boolean("no_refunds").notNull().default(false),
    passportRequired: boolean("passport_required").notNull().default(false),
    shootTypes: jsonb("shoot_types").$type<string[]>().notNull().default([]),
    accommodationLinks: jsonb("accommodation_links").$type<string[]>().notNull().default([]),
    accommodationDetails: jsonb("accommodation_details").$type<string[]>().notNull().default([]),
    included: jsonb("included").$type<string[]>().notNull().default([]),
    requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
    hotelAvailable: boolean("hotel_available").notNull().default(false),
    hotelPriceCents: integer("hotel_price_cents").notNull().default(0),
    hotelModelsAllowed: boolean("hotel_models_allowed").notNull().default(true),
    hotelPhotographersAllowed: boolean("hotel_photographers_allowed").notNull().default(false),
    villaAvailable: boolean("villa_available").notNull().default(false),
    villaPriceCents: integer("villa_price_cents").notNull().default(0),
    villaModelPriceCents: integer("villa_model_price_cents").notNull().default(0),
    villaPhotographerPriceCents: integer("villa_photographer_price_cents").notNull().default(0),
    villaModelSpots: integer("villa_model_spots").notNull().default(0),
    villaPhotographerSpots: integer("villa_photographer_spots").notNull().default(0),
    villaModelsAllowed: boolean("villa_models_allowed").notNull().default(true),
    villaPhotographersAllowed: boolean("villa_photographers_allowed").notNull().default(false),
    airportInfo: text("airport_info").notNull().default(""),
    travelDetails: jsonb("travel_details").$type<EventTravelDetails>().notNull().default({}),
    flightInstructions: text("flight_instructions").notNull().default(""),
    participationPaths: jsonb("participation_paths")
      .$type<EventParticipationPath[]>()
      .notNull()
      .default([]),
    introSentence: text("intro_sentence").notNull().default(""),
    fullDescription: text("full_description").notNull().default(""),
    mediaType: text("media_type").notNull().default("image"),
    mediaData: bytea("media_data"),
    mediaMime: text("media_mime"),
    posterData: bytea("poster_data"),
    posterMime: text("poster_mime"),
    status: proposalStatus("status").notNull().default("submitted"),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("event_proposals_status_created_idx").on(table.status, table.createdAt), index("event_proposals_email_idx").on(table.contactEmail)],
);

export const eventDeletionLogs = pgTable(
  "event_deletion_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull(),
    proposalId: uuid("proposal_id"),
    ownerId: uuid("owner_id"),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("event_deletion_logs_event_idx").on(table.eventId), index("event_deletion_logs_deleted_idx").on(table.deletedAt)],
);

export const eventParticipations = pgTable(
  "event_participations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .references(() => members.id, { onDelete: "cascade" }),
    pathType: text("path_type").notNull(),
    status: participationStatus("status").notNull().default("pending"),
    applicantName: text("applicant_name").notNull(),
    applicantEmail: text("applicant_email").notNull(),
    note: text("note").notNull().default(""),
    withdrawalReason: text("withdrawal_reason"),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    priceCents: integer("price_cents").notNull().default(0),
    sponsorAmountCents: integer("sponsor_amount_cents"),
    accommodationType: text("accommodation_type"),
    accommodationPriceCents: integer("accommodation_price_cents").notNull().default(0),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    guestAccessTokenHash: text("guest_access_token_hash"),
    confirmationEmailSentAt: timestamp("confirmation_email_sent_at", { withTimezone: true }),
    checkInToken: uuid("check_in_token").notNull().defaultRandom(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: uuid("checked_in_by").references(() => members.id, { onDelete: "set null" }),
    checkoutAttempt: uuid("checkout_attempt").notNull().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_participations_event_member_unique").on(
      table.eventId,
      table.memberId,
    ).where(sql`${table.status} not in ('declined', 'cancelled', 'refunded')`),
    uniqueIndex("event_participations_event_email_unique").on(
      table.eventId,
      table.applicantEmail,
    ).where(sql`${table.status} not in ('declined', 'cancelled', 'refunded')`),
    index("event_participations_event_status_idx").on(table.eventId, table.status),
  ],
);

export const eventTransactions = pgTable(
  "event_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    participationId: uuid("participation_id")
      .references(() => eventParticipations.id, { onDelete: "set null" }),
    memberId: uuid("member_id")
      .references(() => members.id, { onDelete: "set null" }),
    hostMemberId: uuid("host_member_id")
      .references(() => members.id, { onDelete: "set null" }),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    confirmationCode: varchar("confirmation_code", { length: 6 }).notNull(),
    grossCents: integer("gross_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull(),
    processingFeeCents: integer("processing_fee_cents").notNull().default(0),
    customerFeeCents: integer("customer_fee_cents").notNull().default(0),
    hostNetCents: integer("host_net_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("paid"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_transactions_checkout_session_unique").on(table.stripeCheckoutSessionId),
    uniqueIndex("event_transactions_payment_intent_unique").on(table.stripePaymentIntentId),
    uniqueIndex("event_transactions_event_confirmation_unique").on(table.eventId, table.confirmationCode),
    index("event_transactions_event_paid_idx").on(table.eventId, table.paidAt),
    index("event_transactions_host_paid_idx").on(table.hostMemberId, table.paidAt),
  ],
);

export const attendeeFlights = pgTable("attendee_flights", {
  participationId: uuid("participation_id").primaryKey().references(() => eventParticipations.id, { onDelete: "cascade" }),
  airline: text("airline").notNull().default(""),
  flightNumber: text("flight_number").notNull(),
  arrivalLocal: text("arrival_local").notNull(),
  departureLocal: text("departure_local").notNull().default(""),
  timezone: text("timezone").notNull(),
  notes: text("notes").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const travelEmailOutbox = pgTable("travel_email_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
  email: text("email").notNull(), title: text("title").notNull(), slug: text("slug").notNull(),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("travel_email_pending_idx").on(table.sentAt, table.nextAttemptAt)]);

export const hostPayoutAccounts = pgTable("host_payout_accounts", {
  memberId: uuid("member_id").primaryKey().references(() => members.id, { onDelete: "cascade" }),
  stripeAccountId: text("stripe_account_id").notNull(),
  chargesEnabled: boolean("charges_enabled").notNull().default(false),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  detailsSubmitted: boolean("details_submitted").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("host_payout_stripe_account_unique").on(table.stripeAccountId)]);

export const eventRefundRequests = pgTable("event_refund_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => eventTransactions.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("requested"),
  decisionNote: text("decision_note").notNull().default(""),
  stripeRefundId: text("stripe_refund_id"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("event_refund_transaction_unique").on(table.transactionId)]);

export const memberNameChanges = pgTable(
  "member_name_changes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    creditsSpent: integer("credits_spent").notNull().default(0),
    previousName: text("previous_name").notNull(),
    newName: text("new_name").notNull(),
    previousUsername: text("previous_username"),
    newUsername: text("new_username"),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("member_name_changes_member_changed_idx").on(table.memberId, table.changedAt),
  ],
);

export const sponsors = pgTable(
  "sponsors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    logoPath: text("logo_path"),
    logoData: bytea("logo_data"),
    logoMime: text("logo_mime"),
    logoFilename: text("logo_filename"),
    websiteUrl: text("website_url"),
    contactEmail: text("contact_email").notNull(),
    contactName: text("contact_name").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    description: text("description").notNull().default(""),
    location: text("location").notNull().default(""),
    sponsorLevel: text("sponsor_level").notNull().default("Partner"),
    preferredPlacement: text("preferred_placement").notNull().default(""),
    preferredLogoSize: text("preferred_logo_size").notNull().default(""),
    brandGuidelines: text("brand_guidelines").notNull().default(""),
    logoUsageApproved: boolean("logo_usage_approved").notNull().default(false),
    sponsorshipStartsOn: text("sponsorship_starts_on"),
    sponsorshipEndsOn: text("sponsorship_ends_on"),
    requiredWording: text("required_wording").notNull().default(""),
    trackingUrl: text("tracking_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sponsors_slug_unique").on(table.slug),
    uniqueIndex("sponsors_name_unique").on(table.name),
  ],
);

export const sponsorMembers = pgTable(
  "sponsor_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsors.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    permission: text("permission").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sponsor_members_member_unique").on(table.memberId),
    uniqueIndex("sponsor_members_sponsor_member_unique").on(
      table.sponsorId,
      table.memberId,
    ),
  ],
);

export const sponsorTierChangeRequests = pgTable(
  "sponsor_tier_change_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sponsorId: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    requestedLevel: text("requested_level").notNull(),
    previousLevel: text("previous_level").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    index("sponsor_tier_member_status_idx").on(table.memberId, table.status),
    index("sponsor_tier_sponsor_status_idx").on(table.sponsorId, table.status),
  ],
);

export const eventSponsors = pgTable(
  "event_sponsors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsors.id, { onDelete: "cascade" }),
    level: text("level").notNull().default("Supporting sponsor"),
    contribution: text("contribution").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_sponsors_event_sponsor_unique").on(
      table.eventId,
      table.sponsorId,
    ),
  ],
);

export const sponsorshipRequests = pgTable(
  "sponsorship_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsors.id, { onDelete: "cascade" }),
    requesterMemberId: uuid("requester_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    targetMemberId: uuid("target_member_id").references(() => members.id, { onDelete: "set null" }),
    direction: text("direction").notNull(),
    message: text("message").notNull(),
    contributionType: text("contribution_type").notNull().default("in_kind"),
    cashAmountCents: integer("cash_amount_cents").notNull().default(0),
    offerDetails: text("offer_details").notNull().default(""),
    flightIncluded: boolean("flight_included").notNull().default(false),
    hotelIncluded: boolean("hotel_included").notNull().default(false),
    representationRequired: boolean("representation_required").notNull().default(false),
    representationTerms: text("representation_terms").notNull().default(""),
    responseNote: text("response_note").notNull().default(""),
    responseMemberId: uuid("response_member_id").references(() => members.id, { onDelete: "set null" }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sponsorship_requests_event_status_idx").on(table.eventId, table.status),
    index("sponsorship_requests_sponsor_status_idx").on(table.sponsorId, table.status),
  ],
);

export const sponsorshipAgreements = pgTable(
  "sponsorship_agreements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id").notNull().references(() => sponsorshipRequests.id, { onDelete: "cascade" }),
    organizerMemberId: uuid("organizer_member_id").references(() => members.id, { onDelete: "set null" }),
    sponsorMemberId: uuid("sponsor_member_id").references(() => members.id, { onDelete: "set null" }),
    beneficiaryMemberId: uuid("beneficiary_member_id").references(() => members.id, { onDelete: "set null" }),
    terms: text("terms").notNull().default(""),
    cashAmountCents: integer("cash_amount_cents").notNull().default(0),
    contributionType: text("contribution_type").notNull().default("in_kind"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    paymentStatus: text("payment_status").notNull().default("not_required"),
    inKindStatus: text("in_kind_status").notNull().default("not_required"),
    fulfillmentNotes: text("fulfillment_notes").notNull().default(""),
    sponsorDeliveredAt: timestamp("sponsor_delivered_at", { withTimezone: true }),
    recipientConfirmedAt: timestamp("recipient_confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    organizerAcceptedAt: timestamp("organizer_accepted_at", { withTimezone: true }),
    sponsorAcceptedAt: timestamp("sponsor_accepted_at", { withTimezone: true }),
    beneficiaryAcceptedAt: timestamp("beneficiary_accepted_at", { withTimezone: true }),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sponsorship_agreement_request_unique").on(table.requestId),
    uniqueIndex("sponsorship_agreement_payment_intent_unique").on(table.stripePaymentIntentId),
  ],
);

export const sponsorshipRequestMessages = pgTable(
  "sponsorship_request_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id").notNull().references(() => sponsorshipRequests.id, { onDelete: "cascade" }),
    senderMemberId: uuid("sender_member_id").references(() => members.id, { onDelete: "set null" }),
    senderName: text("sender_name").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sponsorship_request_messages_request_created_idx").on(table.requestId, table.createdAt)],
);

export const collaborationRequests = pgTable(
  "collaboration_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderMemberId: uuid("sender_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    recipientMemberId: uuid("recipient_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    kind: text("kind").notNull().default("introduction"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("pending"),
    senderHiddenAt: timestamp("sender_hidden_at", { withTimezone: true }),
    recipientHiddenAt: timestamp("recipient_hidden_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("collaboration_requests_recipient_status_idx").on(
      table.recipientMemberId,
      table.status,
    ),
    index("collaboration_requests_sender_idx").on(table.senderMemberId),
  ],
);

export const collaborationMessages = pgTable(
  "collaboration_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => collaborationRequests.id, { onDelete: "cascade" }),
    senderMemberId: uuid("sender_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("collaboration_messages_request_created_idx").on(table.requestId, table.createdAt),
    index("collaboration_messages_sender_idx").on(table.senderMemberId),
  ],
);

export const profileContactAudits = pgTable(
  "profile_contact_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    viewerMemberId: uuid("viewer_member_id").references(() => members.id, { onDelete: "set null" }),
    targetMemberId: uuid("target_member_id").references(() => members.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    contextId: uuid("context_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("profile_contact_viewer_created_idx").on(table.viewerMemberId, table.createdAt),
    index("profile_contact_target_created_idx").on(table.targetMemberId, table.createdAt),
  ],
);

export const homeHeroSlides = pgTable(
  "home_hero_slides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaType: text("media_type").notNull().default("image"),
    mediaPath: text("media_path"),
    mediaData: bytea("media_data"),
    mediaMime: text("media_mime"),
    posterData: bytea("poster_data"),
    posterMime: text("poster_mime"),
    eyebrow: text("eyebrow").notNull(),
    title: text("title").notNull(),
    accentText: text("accent_text").notNull().default(""),
    copy: text("copy").notNull(),
    ctaLabel: text("cta_label").notNull(),
    ctaHref: text("cta_href").notNull(),
    altText: text("alt_text").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("home_hero_slides_active_order_idx").on(table.isActive, table.sortOrder),
  ],
);

export const memberReviews = pgTable(
  "member_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    reviewerMemberId: uuid("reviewer_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    reviewedMemberId: uuid("reviewed_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    overallRating: integer("overall_rating").notNull(),
    reliabilityRating: integer("reliability_rating").notNull(),
    professionalismRating: integer("professionalism_rating").notNull(),
    wouldWorkAgain: boolean("would_work_again").notNull(),
    noShow: boolean("no_show").notNull().default(false),
    comment: text("comment").notNull().default(""),
    status: text("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("member_reviews_event_reviewer_reviewed_unique").on(
      table.eventId,
      table.reviewerMemberId,
      table.reviewedMemberId,
    ),
    index("member_reviews_reviewed_status_idx").on(table.reviewedMemberId, table.status),
    index("member_reviews_event_idx").on(table.eventId),
  ],
);

export const billingCustomers = pgTable(
  "billing_customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_customers_stripe_customer_unique").on(table.stripeCustomerId),
    uniqueIndex("billing_customers_member_unique").on(table.memberId),
    index("billing_customers_email_idx").on(table.email),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    billingCustomerId: uuid("billing_customer_id")
      .notNull()
      .references(() => billingCustomers.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripeProductId: text("stripe_product_id").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    lastPaymentStatus: text("last_payment_status").notNull().default("pending"),
    latestInvoiceId: text("latest_invoice_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subscriptions_stripe_subscription_unique").on(table.stripeSubscriptionId),
    index("subscriptions_customer_status_idx").on(table.billingCustomerId, table.status),
  ],
);

export const stripeWebhookEvents = pgTable(
  "stripe_webhook_events",
  {
    stripeEventId: text("stripe_event_id").primaryKey(),
    type: text("type").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("email_verification_token_unique").on(table.tokenHash),
    index("email_verification_member_idx").on(table.memberId),
  ],
);

export const memberSessions = pgTable(
  "member_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("member_session_token_unique").on(table.tokenHash),
    index("member_session_member_idx").on(table.memberId),
  ],
);

export const accountRecoveryTokens = pgTable("account_recovery_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("account_recovery_token_unique").on(table.tokenHash), index("account_recovery_member_created_idx").on(table.memberId, table.createdAt)]);

export const adminAccounts = pgTable(
  "admin_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_accounts_username_unique").on(table.username)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => adminAccounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_session_token_unique").on(table.tokenHash),
    index("admin_session_admin_idx").on(table.adminId),
  ],
);

export const systemHeartbeats = pgTable(
  "system_heartbeats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: text("status").notNull().default("healthy"),
    cpuPercent: integer("cpu_percent"),
    memoryUsedMb: integer("memory_used_mb"),
    memoryLimitMb: integer("memory_limit_mb"),
    memoryPercent: integer("memory_percent"),
    storageUsedMb: integer("storage_used_mb"),
    storageTotalMb: integer("storage_total_mb"),
    storagePercent: integer("storage_percent"),
    databaseLatencyMs: integer("database_latency_ms"),
    responseTimeMs: integer("response_time_ms"),
    uptimeSeconds: integer("uptime_seconds"),
    detail: text("detail").notNull().default(""),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("system_heartbeats_recorded_idx").on(table.recordedAt),
    index("system_heartbeats_status_recorded_idx").on(table.status, table.recordedAt),
  ],
);

export const systemAlerts = pgTable(
  "system_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    metric: text("metric").notNull(),
    severity: text("severity").notNull().default("warning"),
    title: text("title").notNull(),
    message: text("message").notNull(),
    currentValue: integer("current_value"),
    threshold: integer("threshold"),
    status: text("status").notNull().default("open"),
    firstTriggeredAt: timestamp("first_triggered_at", { withTimezone: true }).notNull().defaultNow(),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }).notNull().defaultNow(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    acknowledgedBy: uuid("acknowledged_by").references(() => adminAccounts.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("system_alerts_status_triggered_idx").on(table.status, table.lastTriggeredAt),
    index("system_alerts_metric_status_idx").on(table.metric, table.status),
  ],
);

export const sitePageSettings = pgTable(
  "site_page_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageKey: text("page_key").notNull(),
    eyebrow: text("eyebrow").notNull().default(""),
    title: text("title").notNull().default(""),
    intro: text("intro").notNull().default(""),
    imagePath: text("image_path").notNull().default(""),
    headerBackgroundColor: text("header_background_color").notNull().default("#11110f"),
    content: jsonb("content").$type<Record<string, string>>().notNull().default({}),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    shareImagePath: text("share_image_path").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("site_page_settings_page_key_unique").on(table.pageKey)],
);

export const sitePageRevisions = pgTable(
  "site_page_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageKey: text("page_key").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, string>>().notNull(),
    adminId: uuid("admin_id").references(() => adminAccounts.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("site_page_revisions_page_created_idx").on(table.pageKey, table.createdAt)],
);

export const siteBrandSettings = pgTable("site_brand_settings", {
  id: text("id").primaryKey().default("default"),
  platformName: text("platform_name").notNull().default("Model Escape"),
  shortName: text("short_name").notNull().default("MODEL ESCAPE"),
  logoPath: text("logo_path").notNull().default(""),
  faviconPath: text("favicon_path").notNull().default("/favicon.svg"),
  shareImagePath: text("share_image_path").notNull().default("/og.png"),
  menuEventsImagePath: text("menu_events_image_path").notNull().default("/images/desert-production.png"),
  menuCommunityImagePath: text("menu_community_image_path").notNull().default("/images/poolside-network.png"),
  menuHostImagePath: text("menu_host_image_path").notNull().default("/images/creative-planning.png"),
  primaryColor: text("primary_color").notNull().default("#ff2d95"),
  darkColor: text("dark_color").notNull().default("#141519"),
  lightColor: text("light_color").notNull().default("#f1efe8"),
  textColor: text("text_color").notNull().default("#11110f"),
  mutedColor: text("muted_color").notNull().default("#a7a9b6"),
  successColor: text("success_color").notNull().default("#16834f"),
  warningColor: text("warning_color").notNull().default("#b68118"),
  dangerColor: text("danger_color").notNull().default("#a31616"),
  headingColor: text("heading_color").notNull().default("#f1f2f6"),
  bodyTextColor: text("body_text_color").notNull().default("#f1f2f6"),
  headerBackgroundColor: text("header_background_color").notNull().default("#191a20"),
  headerTextColor: text("header_text_color").notNull().default("#ffffff"),
  surfaceColor: text("surface_color").notNull().default("#202127"),
  inputBackgroundColor: text("input_background_color").notNull().default("#17181d"),
  inputTextColor: text("input_text_color").notNull().default("#f1f2f6"),
  inputFocusColor: text("input_focus_color").notNull().default("#ff2d95"),
  linkColor: text("link_color").notNull().default("#ff72b8"),
  linkHoverColor: text("link_hover_color").notNull().default("#ff2d95"),
  borderColor: text("border_color").notNull().default("#34353f"),
  buttonBackgroundColor: text("button_background_color").notNull().default("#ff2d95"),
  buttonTextColor: text("button_text_color").notNull().default("#ffffff"),
  buttonHoverColor: text("button_hover_color").notNull().default("#d90072"),
  buttonRadius: text("button_radius").notNull().default("8"),
  dropdownBackgroundColor: text("dropdown_background_color").notNull().default("#202127"),
  dropdownTextColor: text("dropdown_text_color").notNull().default("#ffffff"),
  dropdownHoverColor: text("dropdown_hover_color").notNull().default("#ff2d95"),
  bodyFontSize: text("body_font_size").notNull().default("16"),
  bodyLineHeight: text("body_line_height").notNull().default("26"),
  headingXlSize: text("heading_xl_size").notNull().default("48"),
  headingLgSize: text("heading_lg_size").notNull().default("40"),
  headingMdSize: text("heading_md_size").notNull().default("24"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteMediaAssets = pgTable("site_media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  uploadedByAdminId: uuid("uploaded_by_admin_id").references(() => adminAccounts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberActivityBuckets = pgTable("member_activity_buckets", {
 id: uuid("id").defaultRandom().primaryKey(),
 memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
 bucketAt: timestamp("bucket_at", { withTimezone: true }).notNull(),
}, (table) => [uniqueIndex("member_activity_member_bucket_unique").on(table.memberId, table.bucketAt), index("member_activity_bucket_idx").on(table.bucketAt)]);
