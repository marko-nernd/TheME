import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { memberSessions } from "@/db/schema";
import { hashToken, sessionCookieName } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  const token = store.get(sessionCookieName)?.value;
  if (token) await db.delete(memberSessions).where(eq(memberSessions.tokenHash, hashToken(token)));
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(sessionCookieName);
  return response;
}
