import { NextResponse } from "next/server";
import { getHomeData } from "@/db/queries";
import { shouldRevealRemainingSpots } from "@/lib/event-availability";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getHomeData();
    return NextResponse.json({
      events: data.events.map((event) => ({
        ...event,
        spotsRemaining: shouldRevealRemainingSpots(event.capacity, event.spotsRemaining)
          ? event.spotsRemaining
          : null,
      })),
      members: data.members.map((member) => ({
        ...member,
        image: member.role === "Model" ? `/api/mobile/models/${encodeURIComponent(member.slug)}/image` : member.image,
      })),
      photographers: data.photographers,
      heroSlides: data.heroSlides.map((slide) => ({
        id: slide.id,
        mediaType: slide.mediaType === "video" ? "video" : "image",
        media: slide.hasUpload ? `/api/hero-slides/${slide.id}/media` : slide.mediaPath,
        poster: slide.hasPoster ? `/api/hero-slides/${slide.id}/media?poster=1` : null,
        eyebrow: slide.eyebrow,
        title: slide.title,
        accentText: slide.accentText,
        copy: slide.copy,
        ctaLabel: slide.ctaLabel,
        href: slide.ctaHref,
        alt: slide.altText,
      })),
    });
  } catch (error) {
    console.error("Unable to load mobile home", error);
    return NextResponse.json({ error: "Unable to load home page." }, { status: 500 });
  }
}
