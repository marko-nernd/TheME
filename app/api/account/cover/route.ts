import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

export const runtime = "nodejs";
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumUploadBytes = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || !["model", "photographer"].includes(member.primaryRole)) {
    return NextResponse.json({ error: "A creative account is required." }, { status: 401 });
  }
  try {
    const file = (await request.formData()).get("cover");
    if (!(file instanceof File) || !acceptedTypes.has(file.type) || file.size < 1 || file.size > maximumUploadBytes) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image no larger than 15 MB." }, { status: 400 });
    }
    const coverData = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: 60_000_000 })
      .rotate()
      .resize(1920, 1080, { fit: "cover", position: "centre" })
      .webp({ quality: 84, effort: 5 })
      .toBuffer();
    const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.memberId, member.id)).limit(1);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    await db.update(profiles).set({
      coverData,
      coverMime: "image/webp",
      imagePath: `/api/profiles/${profile.id}/cover`,
      updatedAt: new Date(),
    }).where(eq(profiles.id, profile.id));
    return NextResponse.json({ ok: true, url: `/api/profiles/${profile.id}/cover?v=${Date.now()}` });
  } catch (error) {
    console.error("Cover upload failed", error);
    return NextResponse.json({ error: "The cover image could not be processed." }, { status: 400 });
  }
}
