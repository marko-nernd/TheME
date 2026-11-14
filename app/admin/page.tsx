import { redirect } from "next/navigation";
import AstryxSurface from "@/components/astryx-surface";
import {
  getAdminUsers,
  getAdminEvents,
  getRecentProposals,
  getEventDeletionLogs,
  getRecentSubscriptions,
  getSponsors,
  getAdminSponsorshipRequests,
  getIdentityAuditLogs,
  getAdminHeroSlides,
  getAdminEventTransactions,
  getAdminMemberMessages,
  getAdminReviews,
  getSitePageSettings,
} from "@/db/queries";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAdminMediaLibrary } from "@/lib/admin-media-library";
import { getAdminStripeBillingSummary } from "@/lib/stripe-payment-history";
import AdminWorkspace from "./workspace";
import { defaultSiteBranding, getSiteBranding } from "@/lib/site-branding";
import AdminToastHost from "@/components/admin-toast-host";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  async function safeDatabaseLoad<T>(label: string, request: Promise<T>, fallback: T) {
    try {
      return { value: await request, healthy: true };
    } catch (error) {
      console.warn(`Admin ${label} data is unavailable.`, error);
      return { value: fallback, healthy: false };
    }
  }
  async function safeOptionalLoad<T>(label: string, request: Promise<T>, fallback: T) {
    try {
      return await request;
    } catch (error) {
      console.warn(`Admin ${label} panel is unavailable.`, error);
      return fallback;
    }
  }
  const [proposalLoad, eventDeletionLogLoad, subscriptionLoad, userLoad, eventLoad, sponsorLoad, sponsorshipRequestLoad, identityAuditLoad, heroSlideLoad, eventTransactionLoad, memberMessageLoad, mediaItems, ratingLoad, stripeBilling, sitePages, siteBranding] = await Promise.all([
    safeDatabaseLoad("proposal", getRecentProposals(), []),
    safeDatabaseLoad("event deletion log", getEventDeletionLogs(), []),
    safeDatabaseLoad("subscription", getRecentSubscriptions(), []),
    safeDatabaseLoad("user", getAdminUsers(), []),
    safeDatabaseLoad("event", getAdminEvents(), []),
    safeDatabaseLoad("sponsor", getSponsors(), []),
    safeDatabaseLoad("sponsorship request", getAdminSponsorshipRequests(), []),
    safeDatabaseLoad("identity audit", getIdentityAuditLogs(), []),
    safeDatabaseLoad("homepage hero", getAdminHeroSlides(), []),
    safeDatabaseLoad("transaction", getAdminEventTransactions(), []),
    safeDatabaseLoad("message", getAdminMemberMessages(), []),
    safeOptionalLoad("media", getAdminMediaLibrary(), []),
    safeDatabaseLoad("rating", getAdminReviews(), []),
    safeOptionalLoad("Stripe billing", getAdminStripeBillingSummary(), { configured: false, totalPaidCents: 0, recentPayments: [] }),
    safeOptionalLoad("site pages", getSitePageSettings(), []),
    safeOptionalLoad("site branding", getSiteBranding(), { ...defaultSiteBranding }),
  ]);
  const proposals = proposalLoad.value;
  const eventDeletionLogs = eventDeletionLogLoad.value;
  const subscriptions = subscriptionLoad.value;
  const users = userLoad.value;
  const events = eventLoad.value;
  const sponsors = sponsorLoad.value;
  const sponsorshipRequests = sponsorshipRequestLoad.value;
  const identityAuditLogs = identityAuditLoad.value;
  const heroSlides = heroSlideLoad.value;
  const eventTransactions = eventTransactionLoad.value;
  const memberMessages = memberMessageLoad.value;
  const ratings = ratingLoad.value;
  const databaseHealthy = [
    proposalLoad,
    eventDeletionLogLoad,
    subscriptionLoad,
    userLoad,
    eventLoad,
    sponsorLoad,
    sponsorshipRequestLoad,
    identityAuditLoad,
    heroSlideLoad,
    eventTransactionLoad,
    memberMessageLoad,
    ratingLoad,
  ].every((load) => load.healthy);

  return (
    <main className="admin-shell">
      <AdminToastHost />
      <AstryxSurface>
        <AdminWorkspace
          adminUsername={admin.username}
          siteBranding={siteBranding}
          eventDeletionLogs={eventDeletionLogs.map((log) => ({ ...log, deletedAt: log.deletedAt.toISOString() }))}
          sitePages={sitePages}
          stripeBilling={{
            ...stripeBilling,
            recentPayments: stripeBilling.recentPayments.map((payment) => ({ ...payment, paidAt: payment.paidAt.toISOString() })),
          }}
          mediaItems={mediaItems}
          ratings={ratings.map((rating) => ({
            ...rating,
            reviewerAvatarVersion: rating.reviewerAvatarUpdatedAt?.getTime() ?? null,
            reviewedAvatarVersion: rating.reviewedAvatarUpdatedAt?.getTime() ?? null,
            reviewerAvatarUpdatedAt: undefined,
            reviewedAvatarUpdatedAt: undefined,
            createdAt: rating.createdAt.toISOString(),
          }))}
          memberMessages={memberMessages.map((message) => ({
            ...message,
            senderAvatarVersion: message.senderAvatarUpdatedAt?.getTime() ?? null,
            recipientAvatarVersion: message.recipientAvatarUpdatedAt?.getTime() ?? null,
            senderAvatarUpdatedAt: undefined,
            recipientAvatarUpdatedAt: undefined,
            createdAt: message.createdAt.toISOString(),
          }))}
          eventTransactions={eventTransactions.map((transaction) => ({
            ...transaction,
            paidAt: transaction.paidAt.toISOString(),
          }))}
          heroSlides={heroSlides.map((slide) => ({
            ...slide,
            updatedAt: slide.updatedAt.toISOString(),
          }))}
          systemStatus={{
            database: databaseHealthy,
            stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
            stripePublishable: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
            stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
            stripeCreatorPrice: Boolean(process.env.STRIPE_CREATOR_PRICE_ID),
            stripeProPrice: Boolean(process.env.STRIPE_PRO_PRICE_ID),
            smtp: Boolean(process.env.SMTP_HOST),
            documentEncryption: Boolean(process.env.ID_DOCUMENT_ENCRYPTION_KEY),
            metaAppId: Boolean(process.env.META_APP_ID),
            metaAppSecret: Boolean(process.env.META_APP_SECRET),
            metaRedirectUri: Boolean(process.env.META_OAUTH_REDIRECT_URI),
            instagramAccess: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN),
          }}
          identityAuditLogs={identityAuditLogs.map((log) => ({
            id: log.id,
            memberName: log.memberName ?? "Deleted account",
            action: log.action,
            detail: log.detail,
            createdAt: log.createdAt.toISOString(),
          }))}
          sponsors={sponsors.map((sponsor) => ({
            id: sponsor.id,
            name: sponsor.name,
            category: sponsor.category,
            logoPath: sponsor.logoPath,
            websiteUrl: sponsor.websiteUrl,
            contactEmail: sponsor.contactEmail,
            contactName: sponsor.contactName,
            contactPhone: sponsor.contactPhone,
            description: sponsor.description,
            location: sponsor.location,
            sponsorLevel: sponsor.sponsorLevel,
            preferredPlacement: sponsor.preferredPlacement,
            preferredLogoSize: sponsor.preferredLogoSize,
            brandGuidelines: sponsor.brandGuidelines,
            logoUsageApproved: sponsor.logoUsageApproved,
            sponsorshipStartsOn: sponsor.sponsorshipStartsOn,
            sponsorshipEndsOn: sponsor.sponsorshipEndsOn,
            requiredWording: sponsor.requiredWording,
            trackingUrl: sponsor.trackingUrl,
            active: sponsor.isActive,
          }))}
          sponsorshipRequests={sponsorshipRequests.map((request) => ({
            id: request.id,
            eventTitle: request.eventTitle,
            sponsorName: request.sponsorName,
            direction: request.direction,
            status: request.status,
            message: request.message,
            targetName: request.targetName,
            cashAmountCents: request.cashAmountCents,
            flightIncluded: request.flightIncluded,
            hotelIncluded: request.hotelIncluded,
            representationRequired: request.representationRequired,
            createdAt: request.createdAt.toISOString(),
          }))}
          events={events.map((event) => ({
            id: event.id,
            slug: event.slug,
            title: event.title,
            category: event.category,
            location: event.location,
            countryCode: event.countryCode ?? "US",
            stateCode: event.stateCode ?? event.location.split(",")[1]?.trim() ?? "",
            city: event.city ?? event.location.split(",")[0],
            summary: event.summary,
            description: event.description,
            imagePath: event.imagePath,
            mediaType: event.mediaType === "video" ? "video" : "image",
            hasMedia: event.hasMedia,
            hasPoster: event.hasPoster,
            startsAt: event.startsAt.toISOString(),
            endsAt: event.endsAt?.toISOString() ?? null,
            venue: event.venue ?? "",
            externalEventUrl: event.externalEventUrl ?? "",
            redirectToExternal: event.redirectToExternal,
            costDollars: event.priceCents / 100,
            refundDaysBefore: event.refundDaysBefore,
            refundTerms: event.refundTerms,
            noRefunds: event.noRefunds,
            passportRequired: event.passportRequired,
            travelDetails: event.travelDetails,
            airportInfo: event.airportInfo,
            flightInstructions: event.flightInstructions,
            shootTypes: event.shootTypes,
            participationPaths: event.participationPaths,
            capacity: event.capacity,
            spotsRemaining: event.spotsRemaining,
            included: event.included,
            requirements: event.requirements,
            hotelAvailable: event.hotelAvailable,
            hotelPriceCents: event.hotelPriceCents,
            hotelModelsAllowed: event.hotelModelsAllowed,
            hotelPhotographersAllowed: event.hotelPhotographersAllowed,
            villaAvailable: event.villaAvailable,
            villaModelPriceCents: event.villaModelPriceCents,
            villaPhotographerPriceCents: event.villaPhotographerPriceCents,
            villaModelSpots: event.villaModelSpots,
            villaPhotographerSpots: event.villaPhotographerSpots,
            villaModelsAllowed: event.villaModelsAllowed,
            villaPhotographersAllowed: event.villaPhotographersAllowed,
            isFeatured: event.isFeatured,
            isPublished: event.isPublished,
            updatedAt: event.updatedAt.toISOString(),
          }))}
          users={users.map((user) => ({
            id: user.id,
            name: user.name,
            username: user.username ?? user.name.split(/\s+/)[0].toLowerCase(),
            email: user.email,
            role: user.role,
            market: user.market,
            countryCode: user.countryCode ?? "US",
            stateCode: user.stateCode ?? user.market.split(",")[1]?.trim() ?? "",
            city: user.city ?? user.market.split(",")[0],
            tier: user.tier ?? "none",
            tierOverride: user.tierOverride ?? "",
            subscriptionExempt: user.subscriptionExempt,
            avatarVersion: user.avatarUpdatedAt?.getTime() ?? null,
            profileImagePath: user.profileImagePath,
            emailVerified: Boolean(user.verifiedAt),
            adminApproved: Boolean(user.adminApprovedAt),
            adminApprovalDenied: Boolean(user.adminApprovalDeniedAt),
            organization: user.organization ?? "",
            bio: user.bio,
            phone: user.phone ?? "",
            websiteUrl: user.websiteUrl ?? "",
            portfolioUrl: user.portfolioUrl ?? "",
            profileSlug: user.profileSlug ?? "",
            profileBio: user.profileBio ?? "",
            experienceYears: user.experienceYears ?? 0,
            height: user.height ?? "",
            measurements: user.measurements ?? "",
            hairColor: user.hairColor ?? "",
            eyeColor: user.eyeColor ?? "",
            specialties: user.specialties ?? [],
            xUrl: user.xUrl ?? "",
            instagramUrl: user.instagramUrl ?? "",
            youtubeUrl: user.youtubeUrl ?? "",
            onlyfansUrl: user.onlyfansUrl ?? "",
            customUrl: user.customUrl ?? "",
            isAvailable: user.isAvailable ?? false,
            isPublished: user.isPublished ?? false,
            identityStatus: user.identityStatus,
            identityReviewNotes: user.identityReviewNotes,
            hasIdentityDocument: Boolean(user.identityDocumentId),
            identityDocumentType: user.identityDocumentType,
            identityLegalName: user.identityLegalName,
            identityIssuingCountry: user.identityIssuingCountry,
            identityExpiresOn: user.identityExpiresOn,
            identityHasBack: Boolean(user.identityHasBack),
            identityHasSelfie: Boolean(user.identityHasSelfie),
            lastActiveAt: user.lastActiveAt.toISOString(),
            accountDeletionScheduledAt: user.accountDeletionScheduledAt?.toISOString() ?? null,
            updatedAt: user.updatedAt.toISOString(),
          }))}
          proposals={proposals.map((proposal) => ({
            id: proposal.id,
            title: proposal.title,
            type: proposal.eventType,
            location: proposal.location,
            lead: proposal.contactName,
            role: proposal.role,
            email: proposal.contactEmail,
            budget: proposal.budgetBand,
            status: proposal.status,
            rejectionReason: proposal.rejectionReason,
            createdAt: proposal.createdAt.toISOString(),
          }))}
          subscriptions={subscriptions.map((subscription) => ({
            id: subscription.id,
            email: subscription.email,
            plan: subscription.plan,
            status: subscription.status,
            payment: subscription.lastPaymentStatus,
            renewsAt: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            createdAt: subscription.createdAt.toISOString(),
          }))}
        />
      </AstryxSurface>
    </main>
  );
}
