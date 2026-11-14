import { normalizeSocialProfile } from "@/lib/social-profiles";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { primaryRoleValues, type PrimaryRole } from "@/lib/roles";
import { resolveStructuredLocation } from "@/lib/locations";
import { hashPassword } from "@/lib/auth";
import { purgeMemberAccount } from "@/lib/member-deletion";
import { photographerPlaceholder } from "@/lib/camera-brands";
import { recordAdminAudit } from "@/lib/admin-audit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tiers = new Set([
  "none", "profile", "creator", "silver", "gold", "platinum", "diamond",
  "promoter_launch", "promoter_growth", "promoter_pro", "promoter_agency",
  "sponsor_silver", "sponsor_gold", "sponsor_platinum", "sponsor_diamond",
]);
const creativeTiers = new Set(["profile", "creator", "silver", "gold", "platinum", "diamond"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const [before] = await db.select().from(members).where(eq(members.id, id)).limit(1);
    if (!before) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username =
      typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role : "";
    const location = resolveStructuredLocation(body);
    const market = location?.label ?? "";
    const tier = tiers.has(body.tier) ? body.tier : "profile";
    const verified = body.verified === true;
    const approved = body.approved === true;
    const password = typeof body.password === "string" ? body.password : "";
    if (password && password.length < 4) {
      return NextResponse.json({ error: "A replacement password must be at least four characters." }, { status: 400 });
    }

    if (name.length < 2 || !username || !emailPattern.test(email) || !primaryRoleValues.has(role) || !location) {
      return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
    }

    const updated = await db.transaction(async (transaction) => {
      const [member] = await transaction
        .update(members)
        .set({
          name,
          username,
          email,
          primaryRole: role as PrimaryRole,
          homeMarket: market,
          countryCode: location.countryCode,
          stateCode: location.stateCode,
          city: location.city,
          emailVerifiedAt: verified ? new Date() : null,
          adminApprovedAt: approved ? new Date() : null,
          adminApprovalDeniedAt: approved ? null : before.adminApprovalDeniedAt,
          membershipTierOverride: tier,
          subscriptionExempt: body.subscriptionExempt === true,
          organization: typeof body.organization === "string" ? body.organization.trim().slice(0, 160) || null : null,
          bio: typeof body.bio === "string" ? body.bio.trim().slice(0, 2000) : "",
          phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 60) || null : null,
          websiteUrl: typeof body.websiteUrl === "string" ? body.websiteUrl.trim().slice(0, 500) || null : null,
          portfolioUrl: typeof body.portfolioUrl === "string" ? body.portfolioUrl.trim().slice(0, 500) || null : null,
          ...(password ? { passwordHash: await hashPassword(password) } : {}),
          updatedAt: new Date(),
        })
        .where(eq(members.id, id))
        .returning();
      if (!member) return null;

      const [existingProfile] = await transaction
        .select({ id: profiles.id, imagePath: profiles.imagePath })
        .from(profiles)
        .where(eq(profiles.memberId, id))
        .limit(1);

      if (role === "model" || role === "photographer") {
        if (existingProfile) {
          await transaction
            .update(profiles)
            .set({
              slug: username,
              name,
              role,
              location: market,
              ...(role === "photographer" && existingProfile.imagePath === "/images/desert-production.png" ? { imagePath: photographerPlaceholder(member.cameraBrand) } : {}),
              membershipTier: creativeTiers.has(tier) ? tier : "profile",
              bio: typeof body.profileBio === "string" ? body.profileBio.trim().slice(0, 2000) : "",
              experienceYears: Math.max(0, Math.min(80, Number(body.experienceYears) || 0)),
              height: typeof body.height === "string" ? body.height.trim().slice(0, 40) || null : null,
              measurements: typeof body.measurements === "string" ? body.measurements.trim().slice(0, 100) || null : null,
              hairColor: typeof body.hairColor === "string" ? body.hairColor.trim().slice(0, 80) || null : null,
              eyeColor: typeof body.eyeColor === "string" ? body.eyeColor.trim().slice(0, 80) || null : null,
              specialties: Array.isArray(body.specialties) ? body.specialties.map(String).map((value: string) => value.trim()).filter(Boolean).slice(0, 20) : [],
              xUrl: normalizeSocialProfile("x", body.xUrl),
              instagramUrl: normalizeSocialProfile("instagram", body.instagramUrl),
              youtubeUrl: normalizeSocialProfile("youtube", body.youtubeUrl),
              onlyfansUrl: normalizeSocialProfile("onlyfans", body.onlyfansUrl),
              customUrl: typeof body.customUrl === "string" ? body.customUrl.trim().slice(0, 500) || null : null,
              isAvailable: body.isAvailable === true,
              isVerified: member.identityVerificationStatus === "approved",
              isPublished: approved && body.isPublished !== false,
              updatedAt: new Date(),
            })
            .where(eq(profiles.id, existingProfile.id));
        } else {
          const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";
          await transaction.insert(profiles).values({
            memberId: id,
            slug: `${baseSlug}-${id.slice(0, 8)}`,
            name,
            role,
            location: market,
            imagePath: role === "model" ? "/images/placeholders/model_placeholder.png" : photographerPlaceholder(member.cameraBrand),
            bio: `New ${role} member preparing their public Model Escape profile.`,
            membershipTier: creativeTiers.has(tier) ? tier : "profile",
            isVerified: member.identityVerificationStatus === "approved",
            isAvailable: true,
            isPublished: approved,
          });
        }
      } else if (existingProfile) {
        await transaction
          .update(profiles)
          .set({ isPublished: false, updatedAt: new Date() })
          .where(eq(profiles.id, existingProfile.id));
      }
      return member;
    });

    if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
    await recordAdminAudit({ adminId: admin.id, action: "update", resourceType: "member", resourceId: id, beforeData: before as unknown as Record<string, unknown>, afterData: { name, email, username, role, market, tier, verified, approved, subscriptionExempt: body.subscriptionExempt === true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "That email address or public profile URL is already registered." }, { status: 409 });
    }
    console.error("Admin user update failed", error);
    return NextResponse.json({ error: "Could not update the user." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const [before] = await db.select({ id: members.id, name: members.name, email: members.email, username: members.username, primaryRole: members.primaryRole }).from(members).where(eq(members.id, id)).limit(1);
    const deletion = await purgeMemberAccount(id);
    if (!deletion.deleted) {
      return NextResponse.json({ error: "This account was already deleted or could not be found." }, { status: 404 });
    }
    if (before) await recordAdminAudit({ adminId: admin.id, action: "delete", resourceType: "member", resourceId: id, beforeData: before as Record<string, unknown>, detail: "Member account and associated files were purged; collaboration messages were retained." });
    return NextResponse.json({ ok: true, deletedId: id, billingWarningCount: deletion.billingWarnings.length });
  } catch (error) {
    console.error("Admin user deletion failed", error);
    return NextResponse.json(
      { error: "The account could not be deleted. No data was removed; check the admin server log for the exact cause." },
      { status: 500 },
    );
  }
}
