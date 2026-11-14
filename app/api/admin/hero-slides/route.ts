import { NextResponse } from "next/server";
import { db } from "@/db";
import { homeHeroSlides } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import sharp from "sharp";

export const runtime = "nodejs";

const acceptedMedia = new Set(["image/jpeg", "image/png", "video/mp4"]);
const maxBytes = 10 * 1024 * 1024;

function text(form: FormData, key: string, max: number) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

async function values(form: FormData, requireMedia: boolean) {
  const file = form.get("media");
  const poster = form.get("poster");
  const mediaPath = text(form, "mediaPath", 500);
  const title = text(form, "title", 120);
  const eyebrow = text(form, "eyebrow", 100);
  const copy = text(form, "copy", 700);
  const ctaLabel = text(form, "ctaLabel", 80);
  const ctaHref = text(form, "ctaHref", 300);
  if (ctaHref && !ctaHref.startsWith("/")) {
    throw new Error("INVALID_SLIDE");
  }
  let upload: { mediaData: Buffer; mediaMime: string; mediaType: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (!acceptedMedia.has(file.type) || file.size > maxBytes) throw new Error("INVALID_MEDIA");
    const input = Buffer.from(await file.arrayBuffer());
    const normalized = file.type === "video/mp4"
      ? input
      : file.type === "image/png"
        ? await sharp(input).rotate().resize(1920, 1080, { fit: "cover" }).png({ compressionLevel: 8 }).toBuffer()
        : await sharp(input).rotate().resize(1920, 1080, { fit: "cover" }).jpeg({ quality: 90, progressive: true }).toBuffer();
    upload = {
      mediaData: normalized,
      mediaMime: file.type,
      mediaType: file.type === "video/mp4" ? "video" : "image",
      ...(file.type === "video/mp4" && poster instanceof File && poster.type === "image/jpeg" && poster.size > 0
        ? { posterData: Buffer.from(await poster.arrayBuffer()), posterMime: poster.type }
        : {}),
    };
  } else if (requireMedia && !mediaPath.startsWith("/")) {
    throw new Error("INVALID_MEDIA");
  }
  return {
    ...(upload ?? {}),
    mediaPath: upload ? null : mediaPath || null,
    eyebrow,
    title,
    accentText: text(form, "accentText", 120),
    copy,
    ctaLabel,
    ctaHref,
    altText: text(form, "altText", 240),
    sortOrder: Math.max(0, Number.parseInt(String(form.get("sortOrder") ?? "0"), 10) || 0),
    isActive: form.get("isActive") === "true",
    updatedAt: new Date(),
  };
}

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  try {
    const [created] = await db
      .insert(homeHeroSlides)
      .values(await values(await request.formData(), true))
      .returning({ id: homeHeroSlides.id });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message === "INVALID_MEDIA"
      ? "Upload a 1920×1080 JPEG/PNG or a 16:9 MP4 no larger than 10 MB."
      : "If you add a button link, use a site link beginning with /.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
