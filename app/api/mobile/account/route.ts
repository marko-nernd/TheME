import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { getDashboardProfile, getEventParticipationsForMember } from "@/db/queries";
import { memberPlaceholder } from "@/lib/member-placeholder";

export const dynamic = "force-dynamic";

const activeParticipationStatuses = new Set([
  "pending",
  "approved",
  "awaiting_payment",
  "confirmed",
]);

export async function GET() {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const [creative, participations] = await Promise.all([
    getDashboardProfile(member.id),
    getEventParticipationsForMember(member.id),
  ]);

  return NextResponse.json({
    account: {
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        username: member.username ?? "",
        role: member.primaryRole,
        location: member.homeMarket,
        countryCode: member.countryCode,
        stateCode: member.stateCode,
        city: member.city,
        organization: member.organization,
        bio: member.bio,
        phone: member.phone,
        websiteUrl: member.websiteUrl,
        portfolioUrl: member.portfolioUrl,
        verificationStatus: member.identityVerificationStatus,
        avatar: member.avatarUpdatedAt
          ? `/api/members/${member.id}/avatar?v=${member.avatarUpdatedAt.getTime()}`
          : memberPlaceholder(member.primaryRole),
      },
      profile: creative
        ? {
            slug: creative.profile.slug,
            role: creative.profile.role,
            location: creative.profile.location,
            bio: creative.profile.bio,
            tier: creative.profile.membershipTier,
            available: creative.profile.isAvailable,
            published: creative.profile.isPublished,
            verified: creative.profile.isVerified,
            experienceYears: creative.profile.experienceYears,
            height: creative.profile.height,
            measurements: creative.profile.measurements,
            bustSize: creative.profile.bustSize,
            waistInches: creative.profile.waistInches,
            hipInches: creative.profile.hipInches,
            showBustSize: creative.profile.showBustSize,
            showWaist: creative.profile.showWaist,
            showHips: creative.profile.showHips,
            hairColor: creative.profile.hairColor,
            eyeColor: creative.profile.eyeColor,
            specialties: creative.profile.specialties,
            imagePath: creative.profile.imagePath,
            xUrl: creative.profile.xUrl,
            instagramUrl: creative.profile.instagramUrl,
            youtubeUrl: creative.profile.youtubeUrl,
            onlyfansUrl: creative.profile.onlyfansUrl,
            customUrl: creative.profile.customUrl,
            portfolio: creative.portfolio.map((item) => ({
              id: item.id,
              image: `/api/portfolio/${item.id}`,
              caption: item.caption,
              private: item.isPrivate,
            })),
          }
        : null,
      participations: participations
        .filter((item) => activeParticipationStatuses.has(item.status))
        .map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
    },
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
