import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db";
import { members } from "@/db/schema";
export async function avatarSettings(id: string) {
 const [row] = await db.select({ source: members.avatarSource, provider: members.socialAvatarProvider, handle: members.socialAvatarHandle, version: members.avatarUpdatedAt, hasUpload: members.avatarData, hasSocial: members.socialAvatarData }).from(members).where(eq(members.id, id)).limit(1);
 if (!row) return NextResponse.json({ error: "Account not found." }, { status: 404 });
 return NextResponse.json({ source: row.source, provider: row.provider, handle: row.handle, version: row.version?.getTime() ?? null, hasUpload: Boolean(row.hasUpload), hasSocial: Boolean(row.hasSocial), instagramConfigured: Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET && process.env.INSTAGRAM_REDIRECT_URI) }, { headers: { "cache-control": "no-store" } });
}
export async function limitedBody(response: Response, limit: number) {
 if (!response.ok || !response.body) throw new Error("Social profile could not be loaded. Check the username or try again later.");
 const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
 try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new Error("Social profile image is too large."); chunks.push(value); } } finally { await reader.cancel(); }
 return Buffer.concat(chunks);
}
export async function changeAvatarSource(request: Request, id: string) {
 try {
 const body = await request.json();
 const [member] = await db.select({ upload: members.avatarData, social: members.socialAvatarData }).from(members).where(eq(members.id, id)).limit(1);
 if (!member) return NextResponse.json({ error: "Account not found." }, { status: 404 });
 const updatedAt = new Date();
 if (body.source === "upload") {
  if (!member.upload) return NextResponse.json({ error: "Upload a custom photo first." }, { status: 400 });
  await db.update(members).set({ avatarSource: "upload", avatarUpdatedAt: updatedAt, updatedAt }).where(eq(members.id, id));
 } else if (body.source === "social" && body.saved === true) {
  if (!member.social) return NextResponse.json({ error: "Connect a social profile first." }, { status: 400 });
  await db.update(members).set({ avatarSource: "social", avatarUpdatedAt: updatedAt, updatedAt }).where(eq(members.id, id));
 } else if (body.source === "social") {
  const handle = typeof body.handle === "string" ? body.handle.trim().replace(/^@/, "") : "";
  const github = body.provider === "github";
  if (!github && body.provider !== "bluesky") throw new Error("Choose GitHub or Bluesky. Instagram photo import requires an authorized connection.");
  if (!(github ? /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i : /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i).test(handle) || handle.length > 253) throw new Error("Enter a valid username or full Bluesky handle.");
  const endpoint = github ? `https://api.github.com/users/${encodeURIComponent(handle)}` : `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`;
  const response = await fetch(endpoint, { headers: { "Accept": "application/json", "User-Agent": "ModelEscape" }, redirect: "error", signal: AbortSignal.timeout(10000) });
  const profile = JSON.parse((await limitedBody(response, 256000)).toString());
  const photo = new URL(github ? profile.avatar_url : profile.avatar);
  if (photo.protocol !== "https:" || photo.username || photo.password || photo.port || photo.hostname !== (github ? "avatars.githubusercontent.com" : "cdn.bsky.app")) throw new Error("This profile does not have a supported photo.");
  const image = await fetch(photo, { redirect: "error", signal: AbortSignal.timeout(10000) });
  const bytes = await limitedBody(image, 8 * 1024 * 1024);
  const socialAvatarData = await sharp(bytes, { limitInputPixels: 25000000 }).rotate().resize(500, 500, { fit: "cover" }).webp({ quality: 84 }).toBuffer();
  await db.update(members).set({ avatarSource: "social", socialAvatarData, socialAvatarProvider: body.provider, socialAvatarHandle: handle, avatarUpdatedAt: updatedAt, updatedAt }).where(eq(members.id, id));
 } else throw new Error("Choose an uploaded or social photo.");
 return NextResponse.json({ ok: true, version: updatedAt.getTime() });
 } catch { return NextResponse.json({ error: "Could not import the photo. Check the username and try again. Supported sources are GitHub and Bluesky; Instagram needs an authorized connection." }, { status: 400 }); }
}
export async function removeAvatar(id: string) {
 await db.update(members).set({ avatarData: null, avatarMime: null, socialAvatarData: null, socialAvatarProvider: null, socialAvatarHandle: null, avatarSource: "upload", avatarUpdatedAt: null, updatedAt: new Date() }).where(eq(members.id, id));
 return NextResponse.json({ ok: true });
}
