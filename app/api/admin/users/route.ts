import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/auth";
import { photographerPlaceholder } from "@/lib/camera-brands";
import { primaryRoleValues, type PrimaryRole } from "@/lib/roles";
import { resolveStructuredLocation } from "@/lib/locations";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tiers = new Set([
  "none", "profile", "creator", "silver", "gold", "platinum", "diamond",
  "promoter_launch", "promoter_growth", "promoter_pro", "promoter_agency",
  "sponsor_silver", "sponsor_gold", "sponsor_platinum", "sponsor_diamond",
]);
const creativeTiers = new Set(["profile", "creator", "silver", "gold", "platinum", "diamond"]);

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username =
      typeof body.username === "string" && body.username.trim()
        ? body.username.trim().toLowerCase()
        : name.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "");
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role : "";
    const location = resolveStructuredLocation(body);
    const market = location?.label ?? "";
    const tier = tiers.has(body.tier) ? body.tier : "profile";
    const verified = body.verified === true;

    if (name.length < 2 || !emailPattern.test(email) || password.length < 4 || !primaryRoleValues.has(role) || !location) {
      return NextResponse.json(
        { error: "Name, valid email, market, role, and a temporary password are required." },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (transaction) => {
      const [member] = await transaction
        .insert(members)
        .values({
          name,
          username,
          email,
          passwordHash: await hashPassword(password),
          primaryRole: role as PrimaryRole,
          homeMarket: market,
          countryCode: location.countryCode,
          stateCode: location.stateCode,
          city: location.city,
          emailVerifiedAt: verified ? new Date() : null,
          adminApprovedAt: verified ? new Date() : null,
          membershipTierOverride: tier,
          subscriptionExempt: body.subscriptionExempt === true,
        })
        .returning();

      if (role === "model" || role === "photographer") {
        const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";
        await transaction.insert(profiles).values({
          memberId: member.id,
          slug: `${baseSlug}-${member.id.slice(0, 8)}`,
          name,
          role,
          location: market,
          imagePath: role === "model" ? "/images/placeholders/model_placeholder.png" : photographerPlaceholder(member.cameraBrand),
          bio: `New ${role} member preparing their public Model Escape profile.`,
          membershipTier: creativeTiers.has(tier) ? tier : "profile",
          isVerified: false,
          isAvailable: true,
          isPublished: verified,
        });
      }
      return member;
    });

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "That email address is already registered." }, { status: 409 });
    }
    console.error("Admin user creation failed", error);
    return NextResponse.json({ error: "Could not create the user." }, { status: 500 });
  }
}
