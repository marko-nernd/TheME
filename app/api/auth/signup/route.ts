import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  emailVerificationTokens,
  members,
  profiles,
} from "@/db/schema";
import { createToken, hashPassword, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { primaryRoleValues, type PrimaryRole } from "@/lib/roles";
import { resolveStructuredLocation } from "@/lib/locations";
import { cameraBrands } from "@/lib/camera-brands";
import {
  normalizeProfileIdentifier,
  profileIdentifierIsValid,
  profileIdentifierSuggestions,
} from "@/lib/profile-identifiers";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const primaryRole = typeof body.primaryRole === "string" ? body.primaryRole : "";
    const cameraBrand = typeof body.cameraBrand === "string" && (cameraBrands as readonly string[]).includes(body.cameraBrand) ? body.cameraBrand : null;
    const location = resolveStructuredLocation(body);
    const homeMarket = location?.label ?? "";
    const portfolioUrl =
      primaryRole !== "model" && typeof body.portfolioUrl === "string"
        ? body.portfolioUrl.trim()
        : "";
    const organization =
      primaryRole !== "model" && typeof body.organization === "string"
        ? body.organization.trim().slice(0, 160)
        : "";
    const username = normalizeProfileIdentifier(body.profileIdentifier || name);

    if (
      name.length < 2 ||
      !emailPattern.test(email) ||
      password.length < 10 ||
      !profileIdentifierIsValid(username) ||
      !primaryRoleValues.has(primaryRole) ||
      (primaryRole === "photographer" && !cameraBrand) ||
      !location
    ) {
      return NextResponse.json(
        { error: "Please complete every required field with valid details." },
        { status: 400 },
      );
    }

    if (portfolioUrl) {
      try {
        const parsed = new URL(portfolioUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        return NextResponse.json({ error: "Enter a valid portfolio URL." }, { status: 400 });
      }
    }

    const [existing] = await db
      .select({ id: members.id, emailVerifiedAt: members.emailVerifiedAt })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);

    if (existing?.emailVerifiedAt) {
      return NextResponse.json(
        { error: "An account already exists for this email. Sign in instead." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const [[usernameTaken], [profileSlugTaken]] = await Promise.all([
      db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1),
      db.select({ memberId: profiles.memberId }).from(profiles).where(eq(profiles.slug, username)).limit(1),
    ]);
    if (
      (usernameTaken && usernameTaken.id !== existing?.id) ||
      (profileSlugTaken && profileSlugTaken.memberId !== existing?.id)
    ) {
      return NextResponse.json(
        {
          error: "That public profile URL is already in use. Choose one of the suggested unique identifiers or enter your own.",
          suggestions: profileIdentifierSuggestions(username),
        },
        { status: 409 },
      );
    }
    let memberId = existing?.id;

    if (memberId) {
      await db
        .update(members)
        .set({
          name,
          username,
          passwordHash,
          primaryRole: primaryRole as PrimaryRole,
          homeMarket,
          countryCode: location.countryCode,
          stateCode: location.stateCode,
          city: location.city,
          portfolioUrl: portfolioUrl || null,
          cameraBrand: primaryRole === "photographer" ? cameraBrand : null,
          organization: organization || null,
          adminApprovedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, memberId));
      await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.memberId, memberId));
    } else {
      const [member] = await db
        .insert(members)
        .values({
          name,
          username,
          email,
          passwordHash,
          primaryRole: primaryRole as PrimaryRole,
          homeMarket,
          countryCode: location.countryCode,
          stateCode: location.stateCode,
          city: location.city,
          portfolioUrl: portfolioUrl || null,
          cameraBrand: primaryRole === "photographer" ? cameraBrand : null,
          organization: organization || null,
        })
        .returning({ id: members.id });
      memberId = member.id;
    }

    const token = createToken();
    await db.insert(emailVerificationTokens).values({
      memberId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await sendVerificationEmail({ email, name, token });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
