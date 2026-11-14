import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { portfolioItems, profiles } from "@/db/schema";
import { loadModelImage, modelImageResponse } from "@/lib/mobile-model-media";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const [item] = await db.select({ imagePath: portfolioItems.imagePath, imageData: portfolioItems.imageData, imageMime: portfolioItems.imageMime, itemPrivate: portfolioItems.isPrivate, profilePrivate: profiles.isPremiumBlur })
      .from(portfolioItems).innerJoin(profiles, eq(portfolioItems.profileId, profiles.id))
      .where(and(eq(portfolioItems.id, id), eq(profiles.slug, slug), eq(profiles.role, "model"), eq(profiles.isPublished, true), eq(portfolioItems.isPublished, true))).limit(1);
    if (!item) return new NextResponse(null, { status: 404 });
    const source = await loadModelImage(request, item.imagePath, item.imageData);
    return modelImageResponse(source, item.profilePrivate || item.itemPrivate, item.imageMime || "image/jpeg");
  } catch (error) {
    console.error("Unable to load mobile model portfolio image", error);
    return new NextResponse(null, { status: 404 });
  }
}
