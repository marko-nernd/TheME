import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { portfolioItems, profiles } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import sharp from "sharp";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item] = await db
    .select({
      imageData: portfolioItems.imageData,
      imageMime: portfolioItems.imageMime,
      isPrivate: portfolioItems.isPrivate,
      ownerId: profiles.memberId,
    })
    .from(portfolioItems)
    .innerJoin(profiles, eq(portfolioItems.profileId, profiles.id))
    .where(and(eq(portfolioItems.id, id), eq(portfolioItems.isPublished, true)))
    .limit(1);
  if (!item?.imageData) return new NextResponse(null, { status: 404 });
  if (item.isPrivate) {
    const member = await getCurrentMember();
    if (member?.id !== item.ownerId) {
      const blurred = await sharp(item.imageData).resize({ width: 720, withoutEnlargement: true }).blur(28).webp({ quality: 50 }).toBuffer();
      return new NextResponse(new Uint8Array(blurred), {
        headers: { "content-type": "image/webp", "cache-control": "private, max-age=3600" },
      });
    }
  }
  return new NextResponse(new Uint8Array(item.imageData), {
    headers: {
      "content-type": item.imageMime || "image/webp",
      "cache-control": item.isPrivate ? "private, no-store" : "public, max-age=86400",
    },
  });
}
