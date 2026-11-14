import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { getCurrentMember } from "@/lib/auth";
import { limitedBody } from "@/lib/avatar-source";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
export const runtime = "nodejs";
export async function GET(request: Request) {
 const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
 const result = new URL("/dashboard", site); result.hash = "profile";
 const store = await cookies();
 const saved = store.get("instagram_photo_state")?.value;
 store.set("instagram_photo_state", "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/api/account/social/instagram" });
 try {
  const member = await getCurrentMember();
  const query = new URL(request.url).searchParams;
  if (!member?.emailVerifiedAt || !saved || query.has("error")) throw new Error("Authorization cancelled");
  const state = JSON.parse(saved);
  if (state.memberId !== member.id || state.state !== query.get("state") || !query.get("code")) throw new Error("Invalid state");
  const { INSTAGRAM_APP_ID: client_id, INSTAGRAM_APP_SECRET: client_secret, INSTAGRAM_REDIRECT_URI: redirect_uri } = process.env;
  if (!client_id || !client_secret || !redirect_uri) throw new Error("Not configured");
  const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: new URLSearchParams({ client_id, client_secret, redirect_uri, grant_type: "authorization_code", code: query.get("code")! }), redirect: "error", signal: AbortSignal.timeout(10000) });
  const raw = JSON.parse((await limitedBody(tokenResponse, 256000)).toString());
  const token = raw.access_token ? raw : Array.isArray(raw.data) && raw.data.length === 1 ? raw.data[0] : null;
  if (!token?.access_token) throw new Error("No token");
  const endpoint = new URL("https://graph.instagram.com/me");
  endpoint.search = new URLSearchParams({ fields: "user_id,username,profile_picture_url", access_token: token.access_token }).toString();
  const profileResponse = await fetch(endpoint, { redirect: "error", signal: AbortSignal.timeout(10000) });
  const profile = JSON.parse((await limitedBody(profileResponse, 256000)).toString());
  const imageUrl = new URL(profile.profile_picture_url);
  if (imageUrl.protocol !== "https:" || imageUrl.username || imageUrl.password || imageUrl.port || !["cdninstagram.com", "fbcdn.net"].some((host) => imageUrl.hostname === host || imageUrl.hostname.endsWith(`.${host}`))) throw new Error("Unsupported photo host");
  const imageResponse = await fetch(imageUrl, { redirect: "error", signal: AbortSignal.timeout(10000) });
  const image = await limitedBody(imageResponse, 8 * 1024 * 1024);
  const socialAvatarData = await sharp(image, { limitInputPixels: 25000000 }).rotate().resize(500, 500, { fit: "cover" }).webp({ quality: 84 }).toBuffer();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(members).set({ avatarSource: "social", socialAvatarProvider: "instagram", socialAvatarHandle: String(profile.username).slice(0, 100), socialAvatarData, avatarUpdatedAt: now, updatedAt: now }).where(eq(members.id, member.id));
    await tx.update(profiles).set({ instagramUrl: `https://www.instagram.com/${encodeURIComponent(profile.username)}`, updatedAt: now }).where(eq(profiles.memberId, member.id));
  });
  result.searchParams.set("instagramPhoto", "connected");
 } catch { result.searchParams.set("instagramPhoto", "failed"); }
 return NextResponse.redirect(result);
}
