import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile] = await db.select({
    data: profiles.coverData,
    mime: profiles.coverMime,
    published: profiles.isPublished,
  }).from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!profile?.data || !profile.published) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(profile.data), {
    headers: { "content-type": profile.mime || "image/webp", "cache-control": "public, max-age=86400" },
  });
}
