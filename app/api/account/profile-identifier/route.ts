import { and, eq, isNull, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { normalizeProfileIdentifier, profileIdentifierIsValid } from "@/lib/profile-identifiers";

export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const value = normalizeProfileIdentifier(new URL(request.url).searchParams.get("value") || "");
  if (!profileIdentifierIsValid(value)) {
    return NextResponse.json({ available: false, valid: false, message: "Use 3–48 lowercase letters, numbers, or single hyphens." });
  }
  if (value === member.username) {
    return NextResponse.json({ available: true, valid: true, current: true, message: "This is your current public URL." });
  }
  const [[memberConflict], [profileConflict]] = await Promise.all([
    db.select({ id: members.id }).from(members).where(and(eq(members.username, value), ne(members.id, member.id))).limit(1),
    db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.slug, value), or(isNull(profiles.memberId), ne(profiles.memberId, member.id)))).limit(1),
  ]);
  const available = !memberConflict && !profileConflict;
  return NextResponse.json({ available, valid: true, message: available ? "This public profile URL is available." : "This public profile URL is already being used." });
}
