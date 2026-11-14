import HomeClient from "./home-client";
import { getHomeData, getSitePageSettings } from "@/db/queries";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const page = await getSitePageSettings("home");
  return { title: page.seoTitle || page.title, description: page.seoDescription || page.intro, openGraph: { images: [page.shareImagePath || page.imagePath] } };
}

export default async function Home() {
  const [data, page] = await Promise.all([getHomeData().catch((error) => {
    console.warn("PostgreSQL is unavailable; showing local fallback content.", error);
    return null;
  }), getSitePageSettings("home")]);
  return data ? (
    <HomeClient
      events={data.events}
      members={data.members}
      photographers={data.photographers}
      heroSlides={data.heroSlides.map((slide) => ({
        id: slide.id,
        mediaType: slide.mediaType === "video" ? "video" : "image",
        media: slide.hasUpload ? `/api/hero-slides/${slide.id}/media` : slide.mediaPath ?? "/images/desert-model.jpg",
        poster: slide.hasPoster ? `/api/hero-slides/${slide.id}/media?poster=1` : undefined,
        eyebrow: slide.eyebrow,
        title: slide.title,
        accentText: slide.accentText,
        copy: slide.copy,
        ctaLabel: slide.ctaLabel,
        href: slide.ctaHref,
        alt: slide.altText,
      }))}
      headerBackgroundColor={page.headerBackgroundColor}
      pageContent={page.content}
    />
  ) : <HomeClient headerBackgroundColor={page.headerBackgroundColor} pageContent={page.content} />;
}
