import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { homeHeroSlides } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import sharp from "sharp";

export const runtime = "nodejs";

const acceptedMedia = new Set(["image/jpeg", "image/png", "video/mp4"]);
const maxBytes = 10 * 1024 * 1024;

function field(form: FormData, key: string, max: number) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("media");
  const poster = form.get("poster");
  const title = field(form, "title", 120);
  const eyebrow = field(form, "eyebrow", 100);
  const copy = field(form, "copy", 700);
  const ctaLabel = field(form, "ctaLabel", 80);
  const ctaHref = field(form, "ctaHref", 300);
  if (ctaHref && !ctaHref.startsWith("/")) {
    return NextResponse.json({ error: "If you add a button link, use a site link beginning with /." }, { status: 400 });
  }
  let upload: { mediaData: Buffer; mediaMime: string; mediaType: string; mediaPath: null; posterData?: Buffer; posterMime?: string } | null | undefined;
  if (file instanceof File && file.size > 0) {
    if (!acceptedMedia.has(file.type) || file.size > maxBytes) upload = null;
    else {
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
        mediaPath: null,
        ...(file.type === "video/mp4" && poster instanceof File && poster.type === "image/jpeg" && poster.size > 0
          ? { posterData: Buffer.from(await poster.arrayBuffer()), posterMime: poster.type }
          : {}),
      };
    }
  }
  if (file instanceof File && file.size > 0 && !upload) {
    return NextResponse.json({ error: "Upload a 1920×1080 JPEG/PNG or a 16:9 MP4 no larger than 10 MB." }, { status: 400 });
  }
  const { id } = await params;
  const [updated] = await db
    .update(homeHeroSlides)
    .set({
      ...(upload ?? {}),
      eyebrow,
      title,
      accentText: field(form, "accentText", 120),
      copy,
      ctaLabel,
      ctaHref,
      altText: field(form, "altText", 240),
      sortOrder: Math.max(0, Number.parseInt(String(form.get("sortOrder") ?? "0"), 10) || 0),
      isActive: form.get("isActive") === "true",
      updatedAt: new Date(),
    })
    .where(eq(homeHeroSlides.id, id))
    .returning({ id: homeHeroSlides.id });
  if (!updated) return NextResponse.json({ error: "Slide not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const [deleted] = await db
    .delete(homeHeroSlides)
    .where(eq(homeHeroSlides.id, id))
    .returning({ id: homeHeroSlides.id });
  if (!deleted) return NextResponse.json({ error: "Slide not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
