import { NextResponse } from "next/server";
import { getProfileBySlug } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const data = await getProfileBySlug(slug);
    if (!data || data.profile.role !== "photographer") {
      return NextResponse.json({ error: "Photographer not found." }, { status: 404 });
    }

    const { profile, portfolio, isOnline, cameraBrand } = data;
    return NextResponse.json({
      photographer: {
        slug: profile.slug,
        name: profile.name,
        role: "Photographer",
        location: profile.location,
        image: `/api/mobile/photographers/${encodeURIComponent(profile.slug)}/image`,
        bio: profile.bio,
        available: profile.isAvailable,
        tier: profile.membershipTier,
        experienceYears: profile.experienceYears,
        specialties: profile.specialties,
        cameraBrand,
        isVerified: profile.isVerified,
        isOnline,
        isPrivate: profile.isPremiumBlur,
        xUrl: profile.xUrl,
        instagramUrl: profile.instagramUrl,
        youtubeUrl: profile.youtubeUrl,
        onlyfansUrl: profile.onlyfansUrl,
        customUrl: profile.customUrl,
        portfolio: portfolio.map((item) => ({
          id: item.id,
          image: `/api/mobile/photographers/${encodeURIComponent(profile.slug)}/portfolio/${item.id}`,
          caption: item.caption,
          credit: item.credit,
          isPrivate: profile.isPremiumBlur || item.isPrivate,
        })),
      },
    });
  } catch (error) {
    console.error("Unable to load mobile photographer profile", error);
    return NextResponse.json({ error: "Unable to load photographer profile." }, { status: 500 });
  }
}
