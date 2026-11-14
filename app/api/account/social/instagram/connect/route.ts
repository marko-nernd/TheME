import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
export async function GET() {
 const member = await getCurrentMember();
 if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
 const { INSTAGRAM_APP_ID: appId, INSTAGRAM_APP_SECRET: secret, INSTAGRAM_REDIRECT_URI: redirect } = process.env;
 if (!appId || !secret || !redirect) return NextResponse.json({ error: "Instagram connection needs the site’s Meta app configuration. Use a custom upload until it is configured." }, { status: 503 });
 const state = randomBytes(32).toString("hex");
 (await cookies()).set("instagram_photo_state", JSON.stringify({ state, memberId: member.id }), { httpOnly: true, sameSite: "lax", secure: redirect.startsWith("https://"), maxAge: 600, path: "/api/account/social/instagram" });
 const url = new URL("https://www.instagram.com/oauth/authorize");
 url.search = new URLSearchParams({ client_id: appId, redirect_uri: redirect, response_type: "code", scope: "instagram_business_basic", state }).toString();
 return NextResponse.redirect(url);
}
