import { NextResponse } from "next/server";
import { getProfileBySlug } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const data = await getProfileBySlug(slug);
    if (!data || data.profile.role !== "model") return NextResponse.json({ error: "Model not found." }, { status: 404 });
    const { profile, portfolio, isOnline } = data;
    return NextResponse.json({ model: {
      slug: profile.slug, name: profile.name, role: "Model", location: profile.location,
      image: `/api/mobile/models/${encodeURIComponent(profile.slug)}/image`, bio: profile.bio,
      available: profile.isAvailable, tier: profile.membershipTier, experienceYears: profile.experienceYears,
      specialties: profile.specialties, height: profile.height,
      bustSize: profile.showBustSize ? profile.bustSize : null,
      waistInches: profile.showWaist ? profile.waistInches : null,
      hipInches: profile.showHips ? profile.hipInches : null,
      hairColor: profile.hairColor, eyeColor: profile.eyeColor,
      isVerified: profile.isVerified, isOnline, isPrivate: profile.isPremiumBlur,
      xUrl: profile.xUrl, instagramUrl: profile.instagramUrl, youtubeUrl: profile.youtubeUrl,
      onlyfansUrl: profile.onlyfansUrl, customUrl: profile.customUrl,
      portfolio: portfolio.map((item) => ({ id: item.id, image: `/api/mobile/models/${encodeURIComponent(profile.slug)}/portfolio/${item.id}`, caption: item.caption, credit: item.credit, isPrivate: profile.isPremiumBlur || item.isPrivate })),
    } });
  } catch (error) {
    console.error("Unable to load mobile model profile", error);
    return NextResponse.json({ error: "Unable to load model profile." }, { status: 500 });
  }
}
