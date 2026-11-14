import { NextResponse } from "next/server";
import {
  consumeVerificationToken,
} from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?verification=invalid", publicOrigin));
  }

  const memberId = await consumeVerificationToken(token);
  if (!memberId) {
    return NextResponse.redirect(new URL("/login?verification=expired", publicOrigin));
  }

  return NextResponse.redirect(new URL("/account/pending", publicOrigin));
}
