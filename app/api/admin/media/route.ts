import path from "node:path";
import { unlink } from "node:fs/promises";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteMediaAssets } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAdminMediaLibrary, mediaPublicRoot, type AdminMediaItem } from "@/lib/admin-media-library";

export const runtime = "nodejs";
const acceptedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"]);
const acceptedVideos = new Set(["video/mp4"]);
const maxImageBytes = 15 * 1024 * 1024;
const maxVideoBytes = 25 * 1024 * 1024;

export async function GET() {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  return NextResponse.json({ items: await getAdminMediaLibrary() });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const file = (await request.formData()).get("file");
  const isImage = file instanceof File && acceptedImages.has(file.type);
  const isVideo = file instanceof File && acceptedVideos.has(file.type);
  if (!(file instanceof File) || (!isImage && !isVideo) || file.size < 1 || (isImage ? file.size > maxImageBytes : file.size > maxVideoBytes)) {
    return NextResponse.json({ error: "Upload a JPEG, PNG, WebP, AVIF, or SVG image up to 15 MB, or an MP4 video up to 25 MB." }, { status: 400 });
  }
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = isImage ? sharp(input, { density: 192 }).rotate() : null;
    const metadata = image ? await image.metadata() : null;
    const data = image ? await image.resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 8 }).toBuffer() : input;
    const [asset] = await db.insert(siteMediaAssets).values({
      fileName: file.name.slice(0, 240), mimeType: isVideo ? "video/mp4" : "image/png", data, sizeBytes: data.length,
      width: metadata?.width ?? null, height: metadata?.height ?? null, uploadedByAdminId: admin.id,
    }).returning({ id: siteMediaAssets.id });
    const path = `/api/site-media/${asset.id}`;
    return NextResponse.json({ item: { id: `site:${asset.id}`, path, previewUrl: path, kind: isVideo ? "video" : "image", storage: "database", location: "PostgreSQL · site_media_assets.data", sizeBytes: data.length, width: metadata?.width ?? null, height: metadata?.height ?? null, usages: [], canDelete: true } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "The media file could not be processed." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const body = await request.json();
  const requested = Array.isArray(body.paths) ? body.paths.filter((value: unknown): value is string => typeof value === "string").slice(0, 100) : typeof body.path === "string" ? [body.path] : [];
  if (!requested.length) return NextResponse.json({ error: "Choose at least one media file." }, { status: 400 });
  const library = await getAdminMediaLibrary();
  const selected = requested.map((publicPath: string) => library.find((candidate) => candidate.path === publicPath));
  if (selected.some((item: AdminMediaItem | undefined) => !item)) return NextResponse.json({ error: "One or more media files could not be found." }, { status: 404 });
  if (selected.some((item: AdminMediaItem | undefined) => !item?.canDelete)) return NextResponse.json({ error: "This file is still used on one or more pages. Remove those placements before deleting it." }, { status: 409 });
  const root = mediaPublicRoot();
  const deleted: string[] = [];
  for (const item of selected) {
    if (!item) continue;
    if (item.id.startsWith("site:")) {
      await db.delete(siteMediaAssets).where(eq(siteMediaAssets.id, item.id.slice(5)));
      deleted.push(item.path);
      continue;
    }
    const target = path.resolve(root, `.${item.path}`);
    if (!target.startsWith(`${root}${path.sep}`)) return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
    await unlink(target);
    deleted.push(item.path);
  }
  return NextResponse.json({ ok: true, deleted });
}
