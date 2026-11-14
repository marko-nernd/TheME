import { recordMemberActivity } from "@/lib/member-activity";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { photographerPlaceholder } from "@/lib/camera-brands";
import {
  emailVerificationTokens,
  members,
  memberSessions,
  profiles,
  sponsorMembers,
  sponsors,
} from "@/db/schema";

const scrypt = promisify(scryptCallback);
export const sessionCookieName = "model_escape_session";

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function createSession(memberId: string) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(memberSessions).values({
    memberId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  await db
    .update(members)
    .set({
      lastActiveAt: new Date(),
      inactivityReminderSentAt: null,
      finalWarningSentAt: null,
      accountDeletionScheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(members.id, memberId));
  await recordMemberActivity(memberId);
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://"),
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentMember() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) return null;

  const [member] = await db
    .select({
      id: members.id,
      email: members.email,
      username: members.username,
      name: members.name,
      primaryRole: members.primaryRole,
      homeMarket: members.homeMarket,
      countryCode: members.countryCode,
      stateCode: members.stateCode,
      city: members.city,
      organization: members.organization,
      bio: members.bio,
      phone: members.phone,
      websiteUrl: members.websiteUrl,
      portfolioUrl: members.portfolioUrl,
      cameraBrand: members.cameraBrand,
      avatarUpdatedAt: members.avatarUpdatedAt,
      identityVerificationStatus: members.identityVerificationStatus,
      identityReviewNotes: members.identityReviewNotes,
      emailVerifiedAt: members.emailVerifiedAt,
      adminApprovedAt: members.adminApprovedAt,
      lastActiveAt: members.lastActiveAt,
      inactivityReminderSentAt: members.inactivityReminderSentAt,
      finalWarningSentAt: members.finalWarningSentAt,
      accountDeletionScheduledAt: members.accountDeletionScheduledAt,
    })
    .from(memberSessions)
    .innerJoin(members, eq(memberSessions.memberId, members.id))
    .where(
      and(
        eq(memberSessions.tokenHash, hashToken(token)),
        gt(memberSessions.expiresAt, new Date()),
        isNull(members.deletedAt),
      ),
    )
    .limit(1);

  if (!member) return null;
  if (["model", "photographer"].includes(member.primaryRole)) await recordMemberActivity(member.id);
  const now = new Date();
  if (
    now.getTime() - member.lastActiveAt.getTime() > 60 * 1000 ||
    member.inactivityReminderSentAt ||
    member.finalWarningSentAt ||
    member.accountDeletionScheduledAt
  ) {
    await db
      .update(members)
      .set({
        lastActiveAt: now,
        inactivityReminderSentAt: null,
        finalWarningSentAt: null,
        accountDeletionScheduledAt: null,
        updatedAt: now,
      })
      .where(eq(members.id, member.id));
    member.lastActiveAt = now;
    member.inactivityReminderSentAt = null;
    member.finalWarningSentAt = null;
    member.accountDeletionScheduledAt = null;
  }
  return member;
}

export async function consumeVerificationToken(token: string) {
  const [record] = await db
    .select({
      id: emailVerificationTokens.id,
      memberId: emailVerificationTokens.memberId,
      name: members.name,
      email: members.email,
      primaryRole: members.primaryRole,
      homeMarket: members.homeMarket,
      organization: members.organization,
      portfolioUrl: members.portfolioUrl,
      cameraBrand: members.cameraBrand,
      username: members.username,
    })
    .from(emailVerificationTokens)
    .innerJoin(members, eq(emailVerificationTokens.memberId, members.id))
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, hashToken(token)),
        isNull(emailVerificationTokens.consumedAt),
        gt(emailVerificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!record) return null;

  await db.transaction(async (transaction) => {
    await transaction
      .update(emailVerificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(emailVerificationTokens.id, record.id));
    await transaction
      .update(members)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(members.id, record.memberId));

    if (record.primaryRole === "model" || record.primaryRole === "photographer") {
      const baseSlug = record.username || "member";
      await transaction
        .insert(profiles)
        .values({
          memberId: record.memberId,
          slug: baseSlug,
          name: record.name,
          role: record.primaryRole,
          location: record.homeMarket,
          imagePath:
            record.primaryRole === "model"
              ? "/images/placeholders/model_placeholder.png"
              : photographerPlaceholder(record.cameraBrand),
          bio: `New ${record.primaryRole} member preparing their public Model Escape profile.`,
          portfolioUrl: record.portfolioUrl,
          isVerified: false,
          isAvailable: true,
        })
        .onConflictDoUpdate({
          target: profiles.memberId,
          set: {
            name: record.name,
            slug: baseSlug,
            role: record.primaryRole,
            location: record.homeMarket,
            portfolioUrl: record.portfolioUrl,
            isVerified: false,
            updatedAt: new Date(),
          },
        });
    }

    if (record.primaryRole === "sponsor") {
      const baseSlug =
        (record.organization || record.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "sponsor";
      const [sponsor] = await transaction
        .insert(sponsors)
        .values({
          slug: `${baseSlug}-${record.memberId.slice(0, 8)}`,
          name: record.organization || record.name,
          category: "Brand partner",
          contactEmail: record.email,
          description: "New sponsor preparing partnership information.",
          location: record.homeMarket,
        })
        .returning({ id: sponsors.id });
      await transaction
        .insert(sponsorMembers)
        .values({
          sponsorId: sponsor.id,
          memberId: record.memberId,
          permission: "owner",
        })
        .onConflictDoNothing({ target: sponsorMembers.memberId });
    }
  });

  return record.memberId;
}
