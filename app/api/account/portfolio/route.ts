import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db";
import { portfolioItems, profiles } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getMemberSubscription } from "@/db/queries";
import { portfolioLimits } from "@/db/queries";

export const runtime = "nodejs";
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumUploadBytes = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || (member.primaryRole !== "model" && member.primaryRole !== "photographer")) {
    return NextResponse.json({ error: "A signed-in creative account is required." }, { status: 401 });
  }
  const [profile] = await db.select().from(profiles).where(eq(profiles.memberId, member.id)).limit(1);
  if (!profile) return NextResponse.json({ error: "Complete your public profile first." }, { status: 404 });
  const subscription = await getMemberSubscription(member.id, member.email);
  const tier = (subscription?.plan || profile.membershipTier) as keyof typeof portfolioLimits;
  const limit = portfolioLimits[tier] ?? 0;
  const [{ value: used }] = await db.select({ value: count() }).from(portfolioItems).where(eq(portfolioItems.profileId, profile.id));
  if (!limit || Number(used) >= limit) {
    return NextResponse.json({ error: `Your ${tier} membership allows ${limit} portfolio images.` }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const file = form.get("image");
    const isPrivate = form.get("isPrivate") === "true";
    if (!(file instanceof File) || !acceptedTypes.has(file.type) || file.size < 1 || file.size > maximumUploadBytes) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image no larger than 15 MB." }, { status: 400 });
    }
    if (isPrivate && tier === "profile") {
      return NextResponse.json({ error: "Private blurred images require Creator membership or higher." }, { status: 403 });
    }
    const imageData = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: 1080, height: 1080, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    const [created] = await db.insert(portfolioItems).values({
      profileId: profile.id,
      imagePath: `upload:${crypto.randomUUID()}`,
      imageData,
      imageMime: "image/webp",
      caption: String(form.get("caption") || "").trim().slice(0, 180),
      credit: String(form.get("credit") || "").trim().slice(0, 120) || null,
      isPrivate,
      sortOrder: Number(used),
    }).returning({ id: portfolioItems.id });
    return NextResponse.json({ ok: true, id: created.id, remaining: limit - Number(used) - 1 });
  } catch (error) {
    console.error("Portfolio upload failed", error);
    return NextResponse.json({ error: "The image could not be processed." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Image ID is required." }, { status: 400 });
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.memberId, member.id)).limit(1);
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const deleted = await db.delete(portfolioItems).where(and(
    eq(portfolioItems.id, id),
    eq(portfolioItems.profileId, profile.id),
  )).returning({ id: portfolioItems.id });
  return NextResponse.json({ ok: deleted.length > 0 });
}
