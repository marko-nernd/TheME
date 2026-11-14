import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("uses standard Next.js with PostgreSQL", async () => {
  const [packageJson, schema, config] = await Promise.all([
    read("package.json"),
    read("db/schema.ts"),
    read("drizzle.config.ts"),
  ]);

  assert.match(packageJson, /"dev": "next dev"/);
  assert.match(packageJson, /"pg":/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare/);
  assert.match(config, /dialect: "postgresql"/);
  assert.match(schema, /pgTable/);
  assert.match(schema, /newsletter_subscribers/);
  assert.match(schema, /event_proposals/);
});

test("provides a PostgreSQL-backed event proposal workflow", async () => {
  const [schema, api, wizard, migration] = await Promise.all([
    read("db/schema.ts"),
    read("app/api/event-proposals/route.ts"),
    read("app/host/new/proposal-wizard.tsx"),
    read("drizzle/0001_broken_tyrannus.sql"),
  ]);

  assert.match(schema, /proposalRole/);
  assert.match(api, /transaction\.insert\(eventProposals\)/);
  assert.match(wizard, /STEP \{step\} OF 5/);
  assert.match(wizard, /ParticipationPathEditor/);
  assert.match(wizard, /refundDaysBefore: "60"/);
  assert.match(wizard, /shootTypeOptions/);
  assert.match(wizard, /Passport is required/);
  assert.doesNotMatch(wizard, /Total production budget/);
  assert.match(migration, /CREATE TABLE "event_proposals"/);
});

test("defines signed Stripe monthly billing and ASTRYX product surfaces", async () => {
  const [packageJson, schema, checkout, webhook, wizard, admin] =
    await Promise.all([
      read("package.json"),
      read("db/schema.ts"),
      read("app/api/billing/checkout/route.ts"),
      read("app/api/billing/webhook/route.ts"),
      read("app/host/new/proposal-wizard.tsx"),
      read("app/admin/workspace.tsx"),
    ]);

  assert.match(packageJson, /"@astryxdesign\/core"/);
  assert.match(packageJson, /"stripe"/);
  assert.match(schema, /billing_customers/);
  assert.match(schema, /stripe_webhook_events/);
  assert.match(schema, /subscriptions/);
  assert.match(checkout, /payment_behavior: "default_incomplete"/);
  assert.match(webhook, /constructEvent/);
  assert.match(wizard, /@astryxdesign\/core\/ProgressBar/);
  assert.match(admin, /@astryxdesign\/core\/Table/);
});

test("defines an application and database Docker stack", async () => {
  const [dockerfile, compose, migration, entrypoint] = await Promise.all([
    read("Dockerfile"),
    read("compose.yaml"),
    read("drizzle/0000_easy_lila_cheney.sql"),
    read("scripts/docker-entrypoint.sh"),
  ]);

  assert.match(dockerfile, /FROM node:22-alpine/);
  assert.match(dockerfile, /docker-entrypoint\.sh/);
  assert.match(entrypoint, /scripts\/migrate\.mjs/);
  assert.match(compose, /postgres:17-alpine/);
  assert.match(compose, /condition: service_healthy/);
  assert.match(migration, /CREATE TABLE "events"/);
  assert.match(migration, /CREATE TABLE "profiles"/);
});

test("provides a unified sponsorship negotiation, agreement, and fulfillment workflow", async () => {
  const [schema, decision, messages, agreement, checkout, webhook, workspace] = await Promise.all([
    read("db/schema.ts"),
    read("app/api/sponsorship-requests/[id]/route.ts"),
    read("app/api/sponsorship-requests/[id]/messages/route.ts"),
    read("app/api/sponsorship-agreements/[id]/route.ts"),
    read("app/api/sponsorship-agreements/[id]/checkout/route.ts"),
    read("app/api/billing/webhook/route.ts"),
    read("app/sponsorship-requests/[id]/page.tsx"),
  ]);
  assert.match(schema, /sponsorship_request_messages/);
  assert.match(schema, /responseMemberId/);
  assert.match(schema, /paymentStatus/);
  assert.match(schema, /inKindStatus/);
  assert.match(decision, /"accept", "counter", "decline"/);
  assert.match(decision, /getAuthorizedSponsorshipRequest/);
  assert.match(messages, /sponsorshipRequestMessages/);
  assert.match(agreement, /mark_delivered/);
  assert.match(agreement, /confirm_delivery/);
  assert.match(checkout, /sponsorship_agreement/);
  assert.match(webhook, /finalizeSponsorshipPayment/);
  assert.match(workspace, /sponsorship-status-timeline/);
});

test("links every member card to a tier-aware public profile", async () => {
  const [schema, queries, home, discover, profilePage, previewCard] = await Promise.all([
    read("db/schema.ts"),
    read("db/queries.ts"),
    read("app/home-client.tsx"),
    read("app/discover/page.tsx"),
    read("app/members/[slug]/page.tsx"),
    read("components/model-preview-card.tsx"),
  ]);

  assert.match(schema, /portfolio_items/);
  assert.match(schema, /membershipTier/);
  assert.match(queries, /profile: 0/);
  assert.match(queries, /creator: 8/);
  assert.match(queries, /silver: 16/);
  assert.match(queries, /gold: 24/);
  assert.match(queries, /platinum: 40/);
  assert.match(queries, /diamond: 60/);
  assert.match(home, /ModelPreviewCard/);
  assert.match(discover, /ModelPreviewCard/);
  assert.match(previewCard, /\/members\/\$\{model\.slug\}/);
  assert.match(previewCard, /closeOnOutsideClick/);
  assert.match(profilePage, /Sponsor this \{profile\.role\}/);
  assert.match(profilePage, /Professional details/);
});

test("provides eight image-led events, event details, and paginated models", async () => {
  const [schema, queries, home, eventPreview, eventPage, modelsPage, seed, styles] = await Promise.all([
    read("db/schema.ts"),
    read("db/queries.ts"),
    read("app/home-client.tsx"),
    read("components/event-preview-card.tsx"),
    read("app/events/[slug]/page.tsx"),
    read("app/models/page.tsx"),
    read("scripts/seed.mjs"),
    read("app/globals.css"),
  ]);

  assert.match(schema, /imagePath: text\("image_path"\)/);
  assert.match(schema, /requirements: jsonb/);
  assert.match(queries, /\.limit\(8\)/);
  assert.match(queries, /getEventBySlug/);
  assert.match(queries, /getPaginatedModels/);
  assert.match(home, /home-event-grid/);
  assert.match(home, /EventPreviewCard/);
  assert.match(eventPreview, /\/events\/\$\{event\.slug\}/);
  assert.match(eventPreview, /spotsRemaining/);
  assert.match(eventPreview, /event-preview-hover-stats/);
  assert.match(eventPreview, /poster=\{event\.poster\}/);
  assert.match(eventPage, /What’s included/);
  assert.match(eventPage, /event-hero-details/);
  assert.match(eventPage, /Create an account to join/);
  assert.match(styles, /height: calc\(100svh - 88px\)/);
  assert.match(styles, /\.site-header \{\s*position: sticky/);
  assert.match(modelsPage, /aria-label="Model directory pages"/);
  assert.match(seed, /referenceModelNames/);
  assert.match(seed, /"Noelle Banks"/);
  assert.match(seed, /padStart\(2, "0"\)/);
});

test("protects admin operations and supports premium social profiles", async () => {
  const [schema, adminPage, adminLogin, adminAuth, adminWorkspace, modelsPage, profilePage, seed] =
    await Promise.all([
      read("db/schema.ts"),
      read("app/admin/page.tsx"),
      read("app/api/admin/login/route.ts"),
      read("lib/admin-auth.ts"),
      read("app/admin/workspace.tsx"),
      read("app/models/page.tsx"),
      read("app/members/[slug]/page.tsx"),
      read("scripts/seed.mjs"),
    ]);

  assert.match(schema, /admin_accounts/);
  assert.match(schema, /admin_sessions/);
  assert.match(schema, /isPremiumBlur/);
  assert.match(schema, /instagramUrl/);
  assert.match(adminPage, /if \(!admin\) redirect\("\/admin\/login"\)/);
  assert.match(adminLogin, /verifyPassword/);
  assert.match(adminAuth, /model_escape_admin_session/);
  assert.match(adminWorkspace, /System users/);
  assert.match(adminWorkspace, /Last updated/);
  assert.match(modelsPage, /scroll=\{false\}/);
  assert.match(profilePage, /OnlyFans/);
  assert.match(profilePage, /customUrl/);
  assert.match(seed, /\["admin", await hashPassword\(seedPassword\)\]/);
});

test("provides protected admin create and update workflows for users and events", async () => {
  const [adminPage, workspace, userCreate, userUpdate, eventCreate, eventUpdate, eventPage, eventCard] =
    await Promise.all([
      read("app/admin/page.tsx"),
      read("app/admin/workspace.tsx"),
      read("app/api/admin/users/route.ts"),
      read("app/api/admin/users/[id]/route.ts"),
      read("app/api/admin/events/route.ts"),
      read("app/api/admin/events/[id]/route.ts"),
      read("app/events/[slug]/page.tsx"),
      read("components/event-preview-card.tsx"),
    ]);

  assert.match(adminPage, /getAdminEvents/);
  assert.match(workspace, /Add user \+/);
  assert.match(workspace, /Add event \+/);
  assert.match(workspace, /Save changes/);
  assert.match(userCreate, /getCurrentAdmin/);
  assert.match(userCreate, /db\.transaction/);
  assert.match(userUpdate, /getCurrentAdmin/);
  assert.match(userUpdate, /membershipTier: creativeTiers\.has\(tier\)/);
  assert.match(eventCreate, /getCurrentAdmin/);
  assert.match(eventCreate, /\.insert\(events\)/);
  assert.match(eventUpdate, /getCurrentAdmin/);
  assert.match(eventUpdate, /updateEventWithTravel\(eventId, values\)/);
  assert.match(await read("lib/update-event-travel.ts"), /\.update\(events\)/);
  assert.doesNotMatch(eventPage, /Investment/);
  assert.doesNotMatch(eventCard, /Investment/);
  assert.match(eventPage, />Cost</);
});

test("shares expanded production types across admin and host workflows", async () => {
  const [types, admin, wizard] = await Promise.all([
    read("lib/event-types.ts"),
    read("app/admin/workspace.tsx"),
    read("app/host/new/proposal-wizard.tsx"),
  ]);

  for (const value of ["Destination photoshoot", "Glamour", "Lingerie", "Swimsuit"]) {
    assert.match(types, new RegExp(`\"${value}\"`));
  }
  assert.doesNotMatch(types, /"International photoshoot"/);
  assert.match(admin, /eventTypeOptions\.map/);
  assert.match(wizard, /options=\{eventTypeOptions\}/);
});

test("publishes the event refund policy without prohibited marketing copy", async () => {
  const [eventPage, terms] = await Promise.all([
    read("app/events/[slug]/page.tsx"),
    read("app/terms/page.tsx"),
  ]);
  assert.match(terms, /60 days before the event starts/);
  assert.match(terms, /event creator sets the refund policy/);
  assert.match(eventPage, /event\.refundDaysBefore/);
  assert.match(eventPage, /event\.refundTerms/);
  assert.match(eventPage, /Payments are non-refundable after that cutoff/);
  assert.doesNotMatch(eventPage, /like-minded creatives/i);
  assert.doesNotMatch(terms, /like-minded creatives/i);
});

test("stores creator-controlled refund terms and separate event participation paths", async () => {
  const [schema, workspace, participationApi, checkout, approval, eventPage, participation] = await Promise.all([
    read("db/schema.ts"),
    read("app/admin/workspace.tsx"),
    read("app/api/event-participations/route.ts"),
    read("app/api/event-participations/[id]/checkout/route.ts"),
    read("app/api/host/participations/[id]/route.ts"),
    read("app/events/[slug]/page.tsx"),
    read("lib/participation.ts"),
  ]);

  assert.match(schema, /event_participations/);
  assert.match(schema, /refund_days_before/);
  assert.match(schema, /participation_paths/);
  assert.match(workspace, /ParticipationPathEditor/);
  assert.match(workspace, /defaultValue=\{event\?\.refundDaysBefore \?\? 60\}/);
  assert.match(participationApi, /getCurrentMember/);
  assert.match(checkout, /paymentIntents\.create/);
  assert.match(checkout, /client_secret/);
  assert.match(approval, /events\.ownerId/);
  assert.match(eventPage, /event-participation-grid/);
  for (const value of ["model", "photographer", "sponsor", "attendee"]) {
    assert.match(participation, new RegExp(`type: \"${value}\"`));
  }
});

test("links seeded profiles to members and restricts shared location values", async () => {
  const [seed, locations, autocomplete, signupApi, proposalApi, adminUsers, adminEvents, workspace, eventTypes] =
    await Promise.all([
      read("scripts/seed.mjs"),
      read("lib/locations.ts"),
      read("components/location-autocomplete.tsx"),
      read("app/api/auth/signup/route.ts"),
      read("app/api/event-proposals/route.ts"),
      read("app/api/admin/users/route.ts"),
      read("lib/admin-event-values.ts"),
      read("app/admin/workspace.tsx"),
      read("lib/event-types.ts"),
    ]);

  assert.match(seed, /insert into members/);
  assert.match(seed, /member_id = excluded\.member_id/);
  assert.match(locations, /Country\.getAllCountries/);
  assert.match(locations, /State\.getStatesOfCountry\("US"\)/);
  assert.match(locations, /City\.getCitiesOfCountry/);
  assert.match(locations, /resolveStructuredLocation/);
  assert.match(autocomplete, /defaultCountryCode = "US"/);
  assert.match(autocomplete, /State\s*<select/);
  assert.match(autocomplete, /Choose an exact city from the suggestions/);
  assert.match(signupApi, /resolveStructuredLocation/);
  assert.match(proposalApi, /resolveStructuredLocation/);
  assert.match(adminUsers, /resolveStructuredLocation/);
  assert.match(adminEvents, /resolveStructuredLocation/);
  assert.match(workspace, /User type/);
  assert.match(workspace, /All subscriptions/);
  assert.match(workspace, /filteredUsers/);
  for (const value of ["Casting call", "Event coverage", "Sponsorship activation", "Venue production"]) {
    assert.match(eventTypes, new RegExp(`\"${value}\"`));
  }
});

test("adds demo usernames, attending models, event sponsors, outreach, and admin tabs", async () => {
  const [schema, seed, login, eventPage, profilePage, sponsorApi, admin] =
    await Promise.all([
      read("db/schema.ts"),
      read("scripts/seed.mjs"),
      read("app/api/auth/login/route.ts"),
      read("app/events/[slug]/page.tsx"),
      read("app/members/[slug]/page.tsx"),
      read("app/api/sponsorship-requests/route.ts"),
      read("app/admin/workspace.tsx"),
    ]);

  assert.match(schema, /members_username_unique/);
  assert.match(schema, /event_sponsors/);
  assert.match(schema, /sponsorship_requests/);
  assert.match(seed, /hashPassword\(seedPassword\)/);
  assert.match(seed, /The Miami White Party/);
  assert.match(seed, /Babes in Toyland Charity/);
  assert.match(seed, /FHM/);
  assert.match(login, /members\.username/);
  assert.match(eventPage, /event-attending-models/);
  assert.match(eventPage, /event-sponsor-grid/);
  assert.match(profilePage, /socialLinks\.length > 0/);
  assert.match(sponsorApi, /sendSponsorshipNotice/);
  for (const tab of ["overview", "users", "events", "sponsors", "billing", "system"]) {
    assert.match(admin, new RegExp(`\"${tab}\"`));
  }
});

test("provides role dashboards, editable profiles, sponsor accounts, and collaboration decisions", async () => {
  const [schema, dashboard, profileApi, collaborationApi, collaborationDecision, sponsorDecision, seed] =
    await Promise.all([
      read("db/schema.ts"),
      read("app/dashboard/page.tsx"),
      read("app/api/account/profile/route.ts"),
      read("app/api/collaborations/route.ts"),
      read("app/api/collaborations/[id]/route.ts"),
      read("app/api/sponsorship-requests/[id]/route.ts"),
      read("scripts/seed.mjs"),
    ]);

  assert.match(schema, /"sponsor"/);
  assert.match(schema, /sponsor_members/);
  assert.match(schema, /collaboration_requests/);
  for (const role of ["model", "photographer", "sponsor", "host"]) {
    assert.match(dashboard, new RegExp(`${role}:`));
  }
  assert.match(dashboard, /DashboardProfileForm/);
  assert.match(dashboard, /CollaborationForm/);
  assert.match(profileApi, /transaction/);
  assert.match(profileApi, /profiles\.memberId/);
  assert.match(collaborationApi, /recipientMemberId/);
  assert.match(collaborationDecision, /recipientMemberId/);
  assert.match(sponsorDecision, /sponsorMembers/);
  assert.match(seed, /sponsor_members/);
  assert.match(seed, /Olivia Hart/);
});

test("provides persistent 500px avatars, account billing portal, card navigation, and back controls", async () => {
  const [schema, avatarApi, avatarManager, checkout, portal, dashboard, modelCard, eventCard, memberPage, eventPage] =
    await Promise.all([
      read("db/schema.ts"),
      read("app/api/account/avatar/route.ts"),
      read("components/avatar-manager.tsx"),
      read("app/api/billing/checkout/route.ts"),
      read("app/api/billing/portal/route.ts"),
      read("app/dashboard/page.tsx"),
      read("components/model-preview-card.tsx"),
      read("components/event-preview-card.tsx"),
      read("app/members/[slug]/page.tsx"),
      read("app/events/[slug]/page.tsx"),
    ]);

  assert.match(schema, /avatar_data/);
  assert.match(schema, /billing_customers_member_unique/);
  assert.match(avatarApi, /resize\(500, 500/);
  assert.match(avatarApi, /image\/webp/);
  assert.match(avatarManager, /Replace photo/);
  assert.match(checkout, /getCurrentMember/);
  assert.match(checkout, /metadata: \{ plan, billingInterval, memberId: member\.id \}/);
  assert.match(portal, /billingCustomers\.memberId/);
  assert.match(dashboard, /BillingPortalButton/);
  assert.match(modelCard, /router\.push\(`\/members\//);
  assert.match(eventCard, /router\.push\(`\/events\//);
  assert.match(memberPage, /BackButton/);
  assert.match(eventPage, /BackButton/);
});

test("adds square avatar cropping, private ID review, and role-specific billing", async () => {
  const [schema, cropper, identityApi, adminIdentityApi, adminReviewApi, plans, membership, checkout, styles] =
    await Promise.all([
      read("db/schema.ts"),
      read("components/avatar-manager.tsx"),
      read("app/api/account/verification/route.ts"),
      read("app/api/admin/identity-documents/[memberId]/[side]/route.ts"),
      read("app/api/admin/users/[id]/verification/route.ts"),
      read("lib/membership-plans.ts"),
      read("app/membership/page.tsx"),
      read("app/api/billing/checkout/route.ts"),
      read("app/globals.css"),
    ]);

  assert.match(cropper, /canvas\.width = 500/);
  assert.match(cropper, /Center and crop/);
  assert.match(schema, /identity_documents/);
  assert.match(identityApi, /drivers_license/);
  assert.match(identityApi, /passport/);
  assert.match(adminIdentityApi, /getCurrentAdmin/);
  assert.match(adminReviewApi, /action === "approved"/);
  for (const price of ["2500", "5000", "9900", "19900"]) {
    assert.match(plans, new RegExp(`monthlyCents: ${price}`));
  }
  assert.match(plans, /annualDiscount = 0\.08/);
  assert.doesNotMatch(membership, /pricing-\$\{group\}/);
  assert.match(membership, /Models and photographers start free/);
  assert.match(checkout, /membershipGroupForRole/);
  assert.match(styles, /max\(\.833rem, 10pt\)/);
});

test("embeds Stripe Payment Element and adds activity lifecycle, encrypted IDs, and verified ratings", async () => {
  const [schema, checkoutApi, checkoutClient, lifecycle, crypto, reviewApi, reviewForm, joinForm, entitlements, admin] =
    await Promise.all([
      read("db/schema.ts"),
      read("app/api/billing/checkout/route.ts"),
      read("app/checkout/embedded-checkout.tsx"),
      read("scripts/account-lifecycle-worker.mjs"),
      read("lib/private-document.ts"),
      read("app/api/reviews/route.ts"),
      read("components/member-review-form.tsx"),
      read("app/events/[slug]/join/join-event-form.tsx"),
      read("lib/entitlements.ts"),
      read("app/admin/workspace.tsx"),
    ]);

  assert.match(checkoutApi, /payment_behavior: "default_incomplete"/);
  assert.match(checkoutApi, /latest_invoice\.confirmation_secret/);
  assert.match(checkoutApi, /clientSecret/);
  assert.match(checkoutClient, /<PaymentElement/);
  assert.match(checkoutClient, /confirmPayment/);
  assert.match(schema, /last_active_at/);
  assert.match(schema, /member_reviews/);
  assert.match(schema, /identity_audit_logs/);
  assert.match(lifecycle, /interval '6 months'/);
  assert.match(lifecycle, /interval '14 days'/);
  assert.match(lifecycle, /interval '30 days'/);
  assert.match(crypto, /aes-256-gcm/);
  assert.match(reviewApi, /pending_moderation/);
  assert.match(reviewForm, /Reliability/);
  assert.match(reviewForm, /Professionalism/);
  assert.match(joinForm, /Optional message/);
  assert.match(entitlements, /activeEventLimit/);
  assert.match(admin, /Last active/);
});

test("adds a private Docker heartbeat, durable alerts, and an admin operations monitor", async () => {
  const [schema, metrics, worker, adminApi, alertApi, monitor, compose] = await Promise.all([
    read("db/schema.ts"),
    read("app/api/internal/metrics/route.ts"),
    read("scripts/system-monitor-worker.mjs"),
    read("app/api/admin/system-status/route.ts"),
    read("app/api/admin/system-alerts/[id]/route.ts"),
    read("components/admin-system-monitor.tsx"),
    read("compose.yaml"),
  ]);

  assert.match(schema, /system_heartbeats/);
  assert.match(schema, /system_alerts/);
  assert.match(metrics, /timingSafeEqual/);
  assert.match(metrics, /memory\.current/);
  assert.match(metrics, /pg_database_size/);
  assert.match(metrics, /execFileAsync\("du"/);
  assert.match(worker, /MONITOR_REQUIRED_SAMPLES/);
  assert.match(worker, /sendAlertEmail/);
  assert.match(worker, /status = 'resolved'/);
  assert.match(adminApi, /getCurrentAdmin/);
  assert.match(alertApi, /acknowledgedAt/);
  assert.match(monitor, /refreshes every 30 seconds/);
  assert.match(monitor, /Application container/);
  assert.match(monitor, /Web app storage/);
  assert.match(compose, /system-monitor:/);
});

test("supports confirmed event deletion, runtime Stripe checkout, sponsor contacts, and model approvals", async () => {
  const [
    adminDelete,
    hostDelete,
    deleteHelper,
    deleteDialog,
    checkoutPage,
    checkoutClient,
    participationApi,
    hostDecision,
    dashboard,
    queries,
    eventPage,
    eventsPage,
    styles,
  ] = await Promise.all([
    read("app/api/admin/events/[id]/route.ts"),
    read("app/api/host/events/[id]/route.ts"),
    read("lib/delete-event.ts"),
    read("components/delete-event-button.tsx"),
    read("app/checkout/page.tsx"),
    read("app/checkout/embedded-checkout.tsx"),
    read("app/api/event-participations/route.ts"),
    read("app/api/host/participations/[id]/route.ts"),
    read("app/dashboard/page.tsx"),
    read("db/queries.ts"),
    read("app/events/[slug]/page.tsx"),
    read("app/events/page.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(adminDelete, /export async function DELETE/);
  assert.match(hostDelete, /eq\(events\.ownerId, member\.id\)/);
  assert.match(deleteHelper, /delete\(collaborationRequests\)/);
  assert.match(deleteHelper, /uploads.*events/);
  assert.match(deleteDialog, /Yes, delete event/);
  assert.match(checkoutPage, /NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
  assert.match(checkoutClient, /publishableKey/);
  assert.match(participationApi, /existingParticipation/);
  assert.match(participationApi, /existing: true/);
  assert.match(participationApi, /\["declined", "cancelled", "refunded"\]/);
  assert.match(participationApi, /stripePaymentIntentId: null/);
  assert.match(participationApi, /The model path requires a model account/);
  assert.match(participationApi, /The photographer path requires a photographer account/);
  assert.match(hostDecision, /"confirmed"/);
  assert.match(dashboard, /MemberEventList bookings=|MemberEventList now=/);
  assert.match(await read("components/member-home.tsx"), /Confirmed — you’re going/);
  assert.match(dashboard, /Contact event host/);
  assert.match(queries, /hostEmail: eventOwners\.email/);
  assert.match(eventPage, /Direct checkout/);
  assert.match(eventsPage, /events-directory-list/);
  assert.match(styles, /linear-gradient\(90deg, #171715 0 58%/);
});

test("enforces event tiers, withdrawal history, role ratings, height limits, and stable profile identifiers", async () => {
  const [
    entitlements,
    proposalApi,
    approvalApi,
    collaborationDecision,
    withdrawalApi,
    participationTabs,
    profileApi,
    signupApi,
    signupForm,
    profilePage,
    reviewApi,
    queries,
    schema,
    header,
  ] = await Promise.all([
    read("lib/entitlements.ts"),
    read("app/api/event-proposals/route.ts"),
    read("app/api/admin/proposals/[id]/approve/route.ts"),
    read("app/api/collaborations/[id]/route.ts"),
    read("app/api/event-participations/[id]/withdraw/route.ts"),
    read("components/host-participation-requests.tsx"),
    read("app/api/account/profile/route.ts"),
    read("app/api/auth/signup/route.ts"),
    read("app/signup/signup-form.tsx"),
    read("app/members/[slug]/page.tsx"),
    read("app/api/reviews/route.ts"),
    read("db/queries.ts"),
    read("db/schema.ts"),
    read("components/site-header.tsx"),
  ]);

  assert.match(entitlements, /activeEventLimit: 1/);
  assert.match(entitlements, /activeEventLimit: 3/);
  assert.match(entitlements, /activeEventLimit: 10/);
  assert.match(proposalApi, /assertEventCapacity/);
  assert.match(approvalApi, /assertEventCapacity/);
  assert.match(collaborationDecision, /Accepted a direct event invitation/);
  assert.match(withdrawalApi, /cancelBooking/);
  assert.match(await read("lib/cancel-booking.ts"), /withdrawalReason/);
  assert.match(participationTabs, /Removed \/ withdrawn/);
  assert.match(participationTabs, /groups\.get\(request\.eventId\)/);
  assert.match(participationTabs, /host-participation-event/);
  assert.match(queries, /eventSlug: events\.slug/);
  assert.match(queries, /eventStartsAt: events\.startsAt/);
  assert.match(profileApi, /NAME_CHANGE_LIMIT/);
  assert.match(profileApi, /inches > 7/);
  assert.match(signupApi, /profileIdentifierSuggestions/);
  assert.match(signupForm, /Public profile URL/);
  assert.match(profilePage, /Verified event participation/);
  assert.match(reviewApi, /Ratings require a completed verified collaboration/);
  assert.match(queries, /reviewer\.primary_role = 'model'/);
  assert.match(schema, /member_name_changes/);
  assert.match(header, /label: "Events", href: "\/events"/);
});

test("provides expandable conversation history and 30-day recoverable sent-request deletion", async () => {
  const [
    dashboard,
    conversationHistory,
    adminWorkspace,
    deleteButton,
    queries,
    lifecycle,
    seed,
  ] = await Promise.all([
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/conversation-history.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/sent-request-delete-button.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/queries.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/account-lifecycle-worker.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/seed.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /ConversationHistory/);
  assert.match(conversationHistory, /MESSAGE HISTORY/);
  assert.match(conversationHistory, /Your conversations/);
  assert.match(conversationHistory, /Accepted conversations with other members/);
  assert.match(conversationHistory, /messagesPerPage = 20/);
  assert.match(conversationHistory, /peoplePerPage = 10/);
  assert.match(conversationHistory, /showMessages=\{false\}/);
  assert.match(dashboard, /Deleted \(/);
  assert.match(adminWorkspace, /Conversation archive/);
  assert.match(deleteButton, /role="dialog"/);
  assert.doesNotMatch(deleteButton, /window\.confirm/);
  assert.match(queries, /getDeletedCollaborationOutbox/);
  assert.match(lifecycle, /sender_hidden_at <= now\(\) - interval '30 days'/);
  assert.match(seed, /Average overall/);
  assert.match(seed, /was rude/);
  assert.match(seed, /Excellent photographer/);
  assert.match(seed, /on conflict \(member_id\) do update/);
});

test("adds expanded memberships, icon-only socials, event redirects, and local fee accounting", async () => {
  const [
    plans,
    queries,
    profile,
    eventsPage,
    styles,
    schema,
    proposal,
    hostDestination,
    eventPage,
    checkout,
    webhook,
    feeHelper,
    admin,
    dashboard,
  ] = await Promise.all([
    read("lib/membership-plans.ts"),
    read("db/queries.ts"),
    read("app/members/[slug]/page.tsx"),
    read("app/events/page.tsx"),
    read("app/globals.css"),
    read("db/schema.ts"),
    read("app/host/new/proposal-wizard.tsx"),
    read("components/host-event-destination-control.tsx"),
    read("app/events/[slug]/page.tsx"),
    read("app/api/event-participations/[id]/checkout/route.ts"),
    read("app/api/billing/webhook/route.ts"),
    read("lib/platform-fees.ts"),
    read("app/admin/workspace.tsx"),
    read("app/dashboard/page.tsx"),
  ]);

  assert.match(plans, /name: "Diamond"/);
  assert.match(plans, /sponsor_diamond/);
  assert.match(queries, /profileTierPriority/);
  assert.doesNotMatch(profile, /Around the web/);
  assert.doesNotMatch(profile, /Follow the work/);
  assert.match(profile, /profile-hero-socials/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(eventsPage, /events-directory-card/);
  assert.match(schema, /event_transactions/);
  assert.match(schema, /redirect_to_external/);
  assert.match(proposal, /Redirect visitors to my event website/);
  assert.match(hostDestination, /Customers see and pay the booking and processing fee/);
  assert.match(eventPage, /redirect\(event\.externalEventUrl\)/);
  assert.match(checkout, /redirectToExternal/);
  assert.match(checkout, /record\.status === "approved"/);
  assert.match(checkout, /Could not initialize event payment/);
  assert.match(webhook, /platformFeeCents/);
  assert.match(feeHelper, /eventPlatformFeeRate = 0\.02/);
  assert.match(feeHelper, /eventPlatformFixedFeeCents = 0/);
  assert.match(admin, /Customer service fees/);
  assert.match(feeHelper, /eventCustomerCheckoutCents/);
  assert.match(checkout, /customerFeeCents/);
  assert.match(dashboard, /Event billing/);
});

test("adds tiered annual savings, approval-gated accounts, draggable hero media, admin inbox visibility, and cookie consent", async () => {
  const [plans, schema, login, verify, hero, reorder, heroApi, workspace, cookie, home] = await Promise.all([
    read("lib/membership-plans.ts"),
    read("db/schema.ts"),
    read("app/api/auth/login/route.ts"),
    read("app/api/auth/verify/route.ts"),
    read("components/admin-hero-manager.tsx"),
    read("app/api/admin/hero-slides/reorder/route.ts"),
    read("app/api/admin/hero-slides/route.ts"),
    read("app/admin/workspace.tsx"),
    read("components/cookie-consent.tsx"),
    read("app/home-client.tsx"),
  ]);
  assert.match(plans, /sponsor_gold"\) return 0\.1/);
  assert.match(plans, /sponsor_platinum"\) return 0\.12/);
  assert.match(plans, /sponsor_diamond"\) return 0\.15/);
  assert.match(schema, /adminApprovedAt/);
  assert.match(login, /administrator must approve/);
  assert.doesNotMatch(verify, /createSession/);
  assert.match(hero, /draggable/);
  assert.match(hero, /maxBytes=\{10 \* 1024 \* 1024\}/);
  assert.match(reorder, /sortOrder/);
  assert.match(heroApi, /resize\(1920, 1080/);
  assert.match(workspace, /INCOMING MESSAGES/);
  assert.match(cookie, /model-escape-cookie-consent/);
  assert.match(home, /CookieConsent/);
});

test("provides native per-user message threads with safe trash controls", async () => {
  const [messagesApi, deleteApi, schema, queries, migration] = await Promise.all([
    read("app/api/mobile/messages/route.ts"),
    read("app/api/mobile/messages/[id]/route.ts"),
    read("db/schema.ts"),
    read("db/queries.ts"),
    read("drizzle/0048_organic_joystick.sql"),
  ]);
  assert.match(messagesApi, /getCollaborationMessagesForMember/);
  assert.match(messagesApi, /No-store|no-store/i);
  assert.match(deleteApi, /recipientHiddenAt/);
  assert.match(deleteApi, /senderHiddenAt/);
  assert.match(schema, /recipientHiddenAt/);
  assert.match(queries, /isNull\(collaborationRequests\.recipientHiddenAt\)/);
  assert.match(migration, /recipient_hidden_at/);
});

test("allows blank homepage hero text while hiding empty public elements", async () => {
  const [editor, createApi, updateApi, home] = await Promise.all([
    read("components/admin-hero-manager.tsx"),
    read("app/api/admin/hero-slides/route.ts"),
    read("app/api/admin/hero-slides/[id]/route.ts"),
    read("app/home-client.tsx"),
  ]);
  assert.doesNotMatch(editor, /name="(eyebrow|title|ctaLabel)"[^>]*required/);
  assert.doesNotMatch(editor, /name="copy"[^>]*required/);
  assert.match(createApi, /if \(ctaHref && !ctaHref\.startsWith/);
  assert.match(updateApi, /if \(ctaHref && !ctaHref\.startsWith/);
  assert.match(home, /ctaLabel && slides\[activeSlide\]\.href/);
});

test("adds media usage exploration, ten-point ratings, moderated flake reports, and event-linked reliability", async () => {
  const [media, mediaApi, workspace, reviewApi, reviewForm, adminReviewApi, profile, queries, migration, compose] = await Promise.all([
    read("lib/admin-media-library.ts"),
    read("app/api/admin/media/route.ts"),
    read("app/admin/workspace.tsx"),
    read("app/api/reviews/route.ts"),
    read("components/member-review-form.tsx"),
    read("app/api/admin/reviews/[id]/route.ts"),
    read("app/members/[slug]/page.tsx"),
    read("db/queries.ts"),
    read("drizzle/0023_ten_point_ratings.sql"),
    read("compose.yaml"),
  ]);
  assert.match(media, /generated-media-usage/);
  assert.match(media, /media_references/);
  assert.match(media, /canDelete: usages\.length === 0/);
  assert.match(mediaApi, /This file is still used/);
  assert.match(workspace, /AdminMediaLibrary/);
  assert.match(workspace, /AdminRatingManager/);
  assert.match(reviewApi, /parsed <= 10/);
  assert.match(reviewApi, /pending_moderation/);
  assert.match(reviewForm, /10 — Exceptional/);
  assert.match(reviewForm, /How flake reports work/);
  assert.match(reviewForm, /does not immediately affect/);
  assert.match(adminReviewApi, /status === "hidden"/);
  assert.match(profile, /Verified event participation/);
  assert.match(profile, /<span>Attended<\/span>/);
  assert.match(profile, /out of 10/);
  assert.match(queries, /getMemberReliabilityEvents/);
  assert.match(queries, /participation\.checked_in_at is not null/);
  assert.match(migration, /overall_rating.*\\* 2/s);
  assert.match(compose, /MEDIA_LIBRARY_ROOT/);
  assert.match(workspace, /AdminMediaLibrary/);
});

test("separates member dashboard workspaces into accessible URL-aware tabs", async () => {
  const [dashboard, tabs, styles] = await Promise.all([
    read("app/dashboard/page.tsx"),
    read("components/dashboard-tabs.tsx"),
    read("app/globals.css"),
  ]);

  for (const tab of ["overview", "activity", "connections", "billing", "profile"]) {
    assert.match(dashboard, new RegExp(`id: "${tab}"`));
    assert.match(dashboard, new RegExp(`dashboard-tab-panel-${tab}`));
  }
  assert.match(dashboard, /eligibleReviewTargets\.length > 0/);
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected/);
  assert.match(tabs, /useSyncExternalStore/);
  assert.match(tabs, /window\.location\.hash/);
  assert.match(styles, /\.dashboard-tab-panel \{ display: none;/);
});

test("paginates admin communications with participant images and confirms durable record saves", async () => {
  const [admin, queries, adminPage, userApi, heroManager] = await Promise.all([
    read("app/admin/workspace.tsx"),
    read("db/queries.ts"),
    read("app/admin/page.tsx"),
    read("app/api/admin/users/[id]/route.ts"),
    read("components/admin-hero-manager.tsx"),
  ]);

  assert.match(admin, /adminMessagesPerPage = 50/);
  assert.match(admin, /senderAvatarVersion/);
  assert.match(admin, /recipientAvatarVersion/);
  assert.match(admin, /href=\{profileHref\}/);
  assert.match(admin, /Open \$\{name\}'s profile/);
  assert.match(admin, /aria-label="Member communication pages"/);
  assert.match(admin, /information saved/);
  assert.match(queries, /collaborationSenderProfiles/);
  assert.match(queries, /collaborationRecipientProfiles/);
  assert.match(queries, /senderProfileSlug/);
  assert.match(queries, /recipientProfileSlug/);
  assert.match(adminPage, /senderAvatarVersion:/);
  assert.match(userApi, /slug: username/);
  assert.doesNotMatch(heroManager, /useEffect\(\(\) => setOrdered/);
  assert.match(await read("lib/event-types.ts"), /Networking mixer/);
});

test("links dated rating identities to review history and stores complete sponsor brand contacts", async () => {
  const [ratings, reviewsPage, queries, schema, sponsorForm, profileApi, admin, migration] = await Promise.all([
    read("components/admin-rating-manager.tsx"),
    read("app/users/[username]/reviews/page.tsx"),
    read("db/queries.ts"),
    read("db/schema.ts"),
    read("components/dashboard-profile-form.tsx"),
    read("app/api/account/profile/route.ts"),
    read("app/admin/workspace.tsx"),
    read("drizzle/0025_robust_supernaut.sql"),
  ]);
  assert.match(ratings, /dateStyle: "medium"/);
  assert.match(ratings, /reviewHistoryHref/);
  assert.match(ratings, /size="reviewer"/);
  assert.match(reviewsPage, /getMemberReviewsByUsername/);
  assert.match(reviewsPage, /Reviewed by/);
  assert.match(queries, /reviewer_avatar_updated_at/);
  for (const field of ["sponsorLevel", "preferredPlacement", "brandGuidelines", "logoUsageApproved", "requiredWording", "trackingUrl"]) {
    assert.match(schema, new RegExp(field));
    assert.match(sponsorForm, new RegExp(field));
    assert.match(profileApi, new RegExp(field));
    assert.match(admin, new RegExp(field));
  }
  assert.match(migration, /Written approval|logo_usage_approved/i);
  assert.match(admin, /admin-sponsor-hover-card/);
});

test("purges deleted-member data while retaining messages and supports admin billing overrides", async () => {
  const [migration, lifecycle, userApi, workspace, queries, entitlements, login, profile, reviewsPage, styles] = await Promise.all([
    read("drizzle/0026_flawless_songbird.sql"),
    read("scripts/account-lifecycle-worker.mjs"),
    read("app/api/admin/users/[id]/route.ts"),
    read("app/admin/workspace.tsx"),
    read("db/queries.ts"),
    read("lib/entitlements.ts"),
    read("app/api/auth/login/route.ts"),
    read("app/members/[slug]/page.tsx"),
    read("app/users/[username]/reviews/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(migration, /CREATE OR REPLACE FUNCTION purge_member_account/);
  assert.match(migration, /DELETE FROM member_reviews/);
  assert.match(migration, /DELETE FROM profiles/);
  assert.match(migration, /UPDATE collaboration_requests[\s\S]*sender_hidden_at = NULL/);
  assert.doesNotMatch(migration, /DELETE FROM collaboration_messages/);
  assert.match(lifecycle, /select purge_member_account/);
  assert.match(userApi, /export async function DELETE/);
  assert.match(userApi, /membershipTierOverride: tier/);
  assert.match(workspace, /Delete account permanently/);
  assert.match(workspace, /subscriptionExempt/);
  assert.match(workspace, /AdminUserAvatar/);
  assert.match(workspace, /Stripe status:/);
  assert.match(queries, /members\.membershipTierOverride/);
  assert.match(queries, /isNull\(members\.deletedAt\)/);
  assert.match(entitlements, /membership_tier_override/);
  assert.match(login, /isNull\(members\.deletedAt\)/);
  assert.match(profile, /canViewReviewHistory/);
  assert.match(reviewsPage, /if \(!canView\) notFound/);
  assert.match(styles, /subscription-period-pending/);
});

test("gives hosts an owned-event management tab with protected durable editing", async () => {
  const [header, dashboard, manager, hostApi] = await Promise.all([
    read("components/site-header.tsx"),
    read("app/dashboard/page.tsx"),
    read("components/host-event-manager.tsx"),
    read("app/api/host/events/[id]/route.ts"),
  ]);

  assert.match(header, /\/dashboard#events/);
  assert.match(dashboard, /id: "events", label: "Manage events"/);
  assert.match(dashboard, /dashboard-tab-panel-events/);
  assert.match(dashboard, /<HostEventWorkspace/);
  assert.match(manager, /Save event settings/);
  assert.match(manager, /ParticipationPathEditor/);
  assert.match(manager, /EventMediaManager/);
  assert.match(manager, /api\/host\/events/);
  assert.match(hostApi, /eventValues\(body\)/);
  assert.match(hostApi, /eq\(events\.ownerId, member\.id\)/);
});

test("merges organizer and promoter accounts into one durable Host role", async () => {
  const [roles, schema, migration, signup, membership, admin] = await Promise.all([
    read("lib/roles.ts"),
    read("db/schema.ts"),
    read("drizzle/0052_merge_host_roles.sql"),
    read("app/signup/signup-form.tsx"),
    read("app/membership/page.tsx"),
    read("app/admin/workspace.tsx"),
  ]);

  assert.match(roles, /value: "host"/);
  assert.doesNotMatch(roles, /value: "organizer"/);
  assert.doesNotMatch(roles, /value: "promoter"/);
  assert.match(schema, /"host"/);
  assert.match(migration, /SET "primary_role" = 'host'/);
  assert.match(migration, /SET "role" = 'host'/);
  assert.match(signup, /primaryRole === "host"/);
  assert.match(membership, /eyebrow: "Host membership"/);
  assert.match(admin, /<option value="host">Hosts<\/option>/);
});

test("adds centralized profile entitlements, admin message deletion, CPU history, and SQL backups", async () => {
  const [entitlements, profile, messages, monitor, status, backup, workspace, schema] = await Promise.all([
    read("lib/access-entitlements.ts"),
    read("app/members/[slug]/page.tsx"),
    read("app/api/admin/messages/route.ts"),
    read("components/admin-system-monitor.tsx"),
    read("app/api/admin/system-status/route.ts"),
    read("app/api/admin/backups/sql/route.ts"),
    read("app/admin/workspace.tsx"),
    read("db/schema.ts"),
  ]);
  assert.match(entitlements, /paidProfileRoles/);
  assert.match(profile, /canAccessFullModelProfile/);
  assert.match(messages, /admin_messages_deleted/);
  assert.match(monitor, /\[1, 6, 12, 24\]/);
  assert.match(status, /hours/);
  assert.match(backup, /pg_dump/);
  assert.match(workspace, /Delete selected/);
  assert.match(workspace, /Audit trail/);
  assert.match(schema, /profile_contact_audits/);
  assert.match(schema, /site_page_revisions/);
});

test("adds sponsor-only plans, capped local load testing, hero video posters, and sponsor offer terms", async () => {
  const [sponsorPlans, dashboard, loadTest, picker, heroCreate, heroMedia, schema, sponsorshipForm] = await Promise.all([
    read("app/membership/sponsor/page.tsx"),
    read("app/dashboard/page.tsx"),
    read("app/api/admin/load-test/route.ts"),
    read("components/event-media-picker.tsx"),
    read("app/api/admin/hero-slides/route.ts"),
    read("app/api/hero-slides/[id]/media/route.ts"),
    read("db/schema.ts"),
    read("components/sponsorship-request-form.tsx"),
  ]);
  assert.match(sponsorPlans, /primaryRole !== "sponsor"/);
  assert.match(dashboard, /View sponsor plans/);
  assert.match(loadTest, /Math\.min\(300/);
  assert.ok(loadTest.includes("127.0.0.1:3000/api/health"));
  assert.match(picker, /event-video-poster\.jpg/);
  assert.match(heroCreate, /posterData/);
  assert.match(heroMedia, /wantsPoster/);
  assert.match(schema, /cash_amount_cents/);
  assert.match(sponsorshipForm, /Products or services/);
});

test("shows stored role pricing and direct checkout for model and photographer event paths", async () => {
  const [eventPage, joinPage, participationApi, dashboard, transactions, invoiceRoute, queries] = await Promise.all([
    read("app/events/[slug]/page.tsx"),
    read("app/events/[slug]/join/page.tsx"),
    read("app/api/event-participations/route.ts"),
    read("app/dashboard/page.tsx"),
    read("components/member-event-transactions.tsx"),
    read("app/api/event-transactions/[id]/invoice/route.ts"),
    read("db/queries.ts"),
  ]);

  assert.match(eventPage, /memberParticipationPath\.priceCents/);
  assert.match(eventPage, /Direct checkout/);
  assert.doesNotMatch(eventPage, /isModelRequest\s*\?\s*"No payment"/);
  assert.match(joinPage, /continue directly to secure payment/);
  assert.match(participationApi, /const finalPriceCents = participationPriceCents \+ accommodationPriceCents/);
  assert.match(eventPage, /Already paid/);
  assert.match(joinPage, /You’re already confirmed/);
  assert.match(queries, /getMemberPaidEventParticipation/);
  assert.match(dashboard, /\{ id: "profile", label: "Profile"[^}]*\}[\s\S]*isSimpleMember \? \[\{ id: "billing", label: "Billing"/);
  assert.match(transactions, /Download invoice PDF/);
  assert.match(invoiceRoute, /content-type": "application\/pdf"/);
});

test("lets destination hosts price accommodations by eligible creative role", async () => {
  const [schema, hostManager, eventValues, proposalWizard, participationApi, joinForm, migration] = await Promise.all([
    read("db/schema.ts"),
    read("components/host-event-manager.tsx"),
    read("lib/admin-event-values.ts"),
    read("app/host/new/proposal-wizard.tsx"),
    read("app/api/event-participations/route.ts"),
    read("app/events/[slug]/join/join-event-form.tsx"),
    read("drizzle/0054_accommodation_role_eligibility.sql"),
  ]);
  assert.match(schema, /hotelModelsAllowed/);
  assert.match(schema, /villaPhotographersAllowed/);
  assert.match(hostManager, /Hotel and villa accommodations/);
  assert.match(hostManager, /Who can add the hotel fee/);
  assert.match(eventValues, /hotelModelsAllowed/);
  assert.match(proposalWizard, /hotelModelsAllowed: true/);
  assert.match(proposalWizard, /hotelPhotographersAllowed: false/);
  assert.match(participationApi, /Hotel accommodation is not offered/);
  assert.match(joinForm, /roleHotelAvailable/);
  assert.match(migration, /hotel_models_allowed/);
});

test("gives hosts expandable participant payment and confirmation records", async () => {
  const [querySource, dashboardSource] = await Promise.all([
    read("db/queries.ts"),
    read("components/host-participation-requests.tsx"),
  ]);
  assert.match(querySource, /transactionId: eventTransactions\.id/);
  assert.match(querySource, /confirmationEmailSentAt: eventParticipations\.confirmationEmailSentAt/);
  assert.match(querySource, /\.leftJoin\(eventTransactions, eq\(eventTransactions\.participationId, eventParticipations\.id\)\)/);
  assert.match(dashboardSource, /Needs approval <b>\{pending\.length\}<\/b>/);
  assert.match(dashboardSource, /Awaiting payment <b>\{awaitingPayment\.length\}<\/b>/);
  assert.match(dashboardSource, /Confirmed <b>\{confirmed\.length\}<\/b>/);
  assert.match(dashboardSource, /PAYMENT DETAILS/);
  assert.match(dashboardSource, /Transaction ID/);
  assert.match(dashboardSource, /Confirmation email/);
});

test("protects browser drafts and adds single-use, expiring account recovery", async () => {
  const [signup, host, drafts, recovery] = await Promise.all([read("app/signup/signup-form.tsx"), read("app/host/new/proposal-wizard.tsx"), read("components/use-form-draft.ts"), read("app/api/auth/recovery/route.ts")]);
  assert.match(signup, /Passwords are never saved/);
  assert.doesNotMatch(signup.match(/value: \{[^}]+\}/)?.[0] ?? "", /password/i);
  assert.match(host, /proposalAcknowledged: false/);
  assert.match(host, /defaultCity=\{draftLocation.city\}/);
  assert.match(drafts, /localStorage.removeItem/);
  assert.match(recovery, /isNull\(accountRecoveryTokens.consumedAt\)/);
  assert.match(recovery, /gt\(accountRecoveryTokens.expiresAt, new Date\(\)\)/);
  assert.match(recovery, /delete\(memberSessions\)/);
  assert.match(recovery, /recent.length >= 3/);
});

test("keeps booking totals authoritative and mounts payment on the booking screen", async () => {
  const [join, api, checkout, billing] = await Promise.all([read("app/events/[slug]/join/join-event-form.tsx"), read("app/api/event-participations/route.ts"), read("app/checkout/event/[id]/payment-element.tsx"), read("app/api/billing/checkout/route.ts")]);
  assert.match(join, /<EventPaymentElement participationId=\{booking.id\}/);
  assert.match(join, /booking\?\.quote/);
  assert.match(api, /quote: eventCustomerCheckoutCents\(existingParticipation.priceCents\)/);
  assert.match(api, /emailAccessSent: true/);
  assert.match(checkout, /Pay \$\{new Intl.NumberFormat/);
  assert.match(billing, /if \(activeSubscription\)/);
});

test("provides private passes, host-only atomic check-in, and inactive-pass protection", async () => {
  const [pass, scanner, calendar, api, migration] = await Promise.all([read("lib/event-pass.ts"), read("components/host-check-in.tsx"), read("app/passes/[id]/calendar/route.ts"), read("app/api/host/events/[id]/check-in/route.ts"), read("drizzle/0062_event_passes_and_payouts.sql")]);
  assert.match(pass, /pass.memberId === memberId/);
  assert.match(pass, /hashToken\(guestToken\)/);
  assert.match(pass, /MEPASS:/);
  assert.match(api, /eq\(events.ownerId, memberId\)/);
  assert.match(api, /isNull\(eventParticipations.checkedInAt\)/);
  assert.match(api, /EXISTS \(SELECT 1 FROM event_transactions/);
  assert.match(scanner, /BarcodeDetector/);
  assert.match(scanner, /visibilitychange/);
  assert.match(calendar, /text\/calendar/);
  assert.match(calendar, /private, no-store/);
  assert.match(migration, /check_in_token/);
});

test("serializes reservations and reuses test PaymentIntents without resurrecting canceled bookings", async () => {
  const [booking, checkout, finalizer, cancel, webhook] = await Promise.all([read("app/api/event-participations/route.ts"), read("app/api/event-participations/[id]/checkout/route.ts"), read("lib/event-payments.ts"), read("lib/cancel-booking.ts"), read("app/api/billing/webhook/route.ts")]);
  assert.match(booking, /database.transaction/);
  assert.match(booking, /\.for\("update"\)/);
  assert.match(checkout, /idempotencyKey: `event-payment-/);
  assert.match(checkout, /status === "processing"/);
  assert.match(finalizer, /refund_required/);
  assert.match(finalizer, /paymentIntent.amount !== locked.priceCents \+ fee/);
  assert.match(cancel, /paymentIntents.cancel/);
  assert.match(webhook, /Only test-mode Stripe events/);
  assert.match(webhook, /inArray\(eventParticipations.status, \["approved", "awaiting_payment"\]\)/);
});

test("adds explicit test-only payout onboarding and refund decisions without auto-penalizing no-shows", async () => {
  const [payouts, refund, refunds, review] = await Promise.all([read("lib/host-payouts.ts"), read("app/api/host/refunds/[id]/route.ts"), read("app/api/event-transactions/[id]/refund/route.ts"), read("app/api/reviews/route.ts")]);
  assert.match(payouts, /startsWith\("sk_test_"\)/);
  assert.match(refund, /idempotencyKey: `event-refund-full-/);
  assert.match(refund, /reverse_transfer: true/);
  assert.match(refunds, /Date.now\(\) <= cutoff.getTime\(\)/);
  assert.match(review, /target_checked_in/);
});

test("provides dark site-wide tokens, accessible mega menus, and reduced-motion scroll storytelling", async () => {
  const [layout, header, motion, cinematic, dark, runtime, stripe] = await Promise.all([
    read("app/layout.tsx"), read("components/site-header.tsx"), read("components/home-scroll-experience.tsx"),
    read("app/cinematic.css"), read("app/dark-theme.css"), read("components/site-branding-runtime.tsx"), read("lib/stripe-appearance.ts"),
  ]);
  assert.match(layout, /data-site-theme="dark"/);
  assert.match(header, /aria-expanded=\{activeMenu === group.id\}/);
  assert.match(header, /event.key === "Escape"/);
  assert.match(header, /site-scroll-progress/);
  assert.match(header, /menuGroups/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.match(motion, /IntersectionObserver/);
  assert.match(motion, /requestAnimationFrame/);
  assert.doesNotMatch(motion, /preventDefault|wheel|touchmove/);
  assert.match(cinematic, /position: sticky/);
  assert.match(dark, /--paper: #141519/);
  assert.match(runtime, /setProperty\("--paper", settings.darkColor\)/);
  assert.match(stripe, /theme: "night"/);
});
