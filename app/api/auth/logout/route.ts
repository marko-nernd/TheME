import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { memberSessions } from "@/db/schema";
import { hashToken, sessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (token) {
    await db
      .delete(memberSessions)
      .where(eq(memberSessions.tokenHash, hashToken(token)));
  }
  const response = NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_SITE_URL ?? request.url),
    303,
  );
  response.cookies.delete(sessionCookieName);
  return response;
}
