import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function loadModelImage(request: Request, imagePath: string, uploaded?: Buffer | null) {
  if (uploaded?.length) return uploaded;
  if (imagePath.startsWith("/images/")) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const target = path.resolve(publicRoot, `.${imagePath}`);
    if (!target.startsWith(`${publicRoot}${path.sep}`)) throw new Error("Invalid image path");
    return readFile(target);
  }
  const url = new URL(imagePath, request.url);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Unsupported image URL");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load image");
  return Buffer.from(await response.arrayBuffer());
}

export async function modelImageResponse(source: Buffer, isPrivate: boolean, mime = "image/webp") {
  if (isPrivate) {
    const blurred = await sharp(source).resize({ width: 720, withoutEnlargement: true }).blur(32).webp({ quality: 48 }).toBuffer();
    return new Response(new Uint8Array(blurred), { headers: { "content-type": "image/webp", "cache-control": "private, max-age=900" } });
  }
  return new Response(new Uint8Array(source), { headers: { "content-type": mime, "cache-control": "public, max-age=86400" } });
}
