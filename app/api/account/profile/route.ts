import { profileEditCharge } from "@/lib/profile-edit-policy";
import { normalizeSocialProfile } from "@/lib/social-profiles";
import { and, desc, eq, gte, ne, sql, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { billingCustomers, memberNameChanges, members, profiles, sponsorMembers, sponsors, subscriptions } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { resolveStructuredLocation } from "@/lib/locations";
import { normalizeProfileIdentifier, profileIdentifierIsValid } from "@/lib/profile-identifiers";

function optionalText(value: unknown, max = 500) {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : null;
}

function optionalUrl(value: unknown) {
  const clean = optionalText(value, 500);
  if (!clean) return null;
  const url = new URL(clean);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid URL");
  return url.toString();
}

function optionalInteger(value: unknown, minimum: number, maximum: number) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error("INVALID_MEASUREMENTS");
  return parsed;
}

export async function PATCH(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const section = member.primaryRole === "sponsor" && ["public", "contact", "company", "brand"].includes(body.sponsorSection) ? body.sponsorSection as string : null;
    const edits = (target: string) => !section || section === target;
    const name = edits("public") ? optionalText(body.name, 120) : member.name;
    const username = normalizeProfileIdentifier(edits("public") ? body.profileIdentifier : member.username);
    const location = resolveStructuredLocation(edits("company") ? body : member);
    if (!name || !location || !profileIdentifierIsValid(username)) {
      return NextResponse.json(
        { error: "Enter your name, a valid public profile identifier, and an exact location." },
        { status: 400 },
      );
    }
    const nameChanged = name !== member.name;
    const usernameChanged = username !== member.username;

    if (usernameChanged) {
      const [[memberConflict], [profileConflict]] = await Promise.all([
        db.select({ id: members.id }).from(members).where(and(eq(members.username, username), ne(members.id, member.id))).limit(1),
        db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.slug, username), ne(profiles.memberId, member.id))).limit(1),
      ]);
      if (memberConflict || profileConflict) {
        return NextResponse.json({ error: "That public profile URL is already in use." }, { status: 409 });
      }
    }

    const sharedValues = {
      name,
      homeMarket: edits("company") ? location.label : undefined,
      countryCode: edits("company") ? location.countryCode : undefined,
      stateCode: edits("company") ? location.stateCode : undefined,
      city: edits("company") ? location.city : undefined,
      organization: edits("company") ? optionalText(body.organization, 160) : undefined,
      bio: edits("public") ? optionalText(body.bio, 1800) ?? "" : undefined,
      phone: !section ? optionalText(body.phone, 40) : undefined,
      websiteUrl: edits("public") ? optionalUrl(body.websiteUrl) : undefined,
      portfolioUrl: !section ? optionalUrl(body.portfolioUrl) : undefined,
      updatedAt: new Date(),
    };
    let sponsorMembershipLevel = "Partner";
    if (member.primaryRole === "sponsor") {
      const [billing] = await db
        .select({ plan: subscriptions.plan, override: members.membershipTierOverride })
        .from(members)
        .leftJoin(billingCustomers, eq(billingCustomers.memberId, members.id))
        .leftJoin(subscriptions, and(eq(subscriptions.billingCustomerId, billingCustomers.id), sql`${subscriptions.status} in ('active', 'trialing')`))
        .where(eq(members.id, member.id))
        .orderBy(desc(subscriptions.updatedAt))
        .limit(1);
      const plan = billing?.plan || billing?.override || "";
      sponsorMembershipLevel = plan.includes("diamond") ? "Diamond" : plan.includes("platinum") ? "Platinum" : plan.includes("gold") ? "Gold" : plan.includes("silver") ? "Silver" : "Partner";
    }

    await db.transaction(async (transaction) => {
      const [locked] = await transaction.select({name:members.name,username:members.username,used:members.profileIdentityChangesUsed,balance:members.profileCredits}).from(members).where(and(eq(members.id,member.id),isNull(members.deletedAt))).for("update");
      if(!locked)throw new Error("ACCOUNT_UNAVAILABLE");
      const actualNameChanged=name!==locked.name;const actualUrlChanged=username!==locked.username;
      const charge=profileEditCharge(locked.used,locked.balance,actualNameChanged,actualUrlChanged);
      if(actualNameChanged||actualUrlChanged){
        await transaction.update(members).set({profileIdentityChangesUsed:charge.freeChange?locked.used+1:locked.used,profileCredits:locked.balance-charge.credits}).where(eq(members.id,member.id));
        await transaction.insert(memberNameChanges).values({memberId:member.id,previousName:locked.name,newName:name,previousUsername:locked.username,newUsername:username,creditsSpent:charge.credits});
      }
      await transaction
        .update(members)
        .set({ ...sharedValues, username })
        .where(eq(members.id, member.id));

      if (member.primaryRole === "model" || member.primaryRole === "photographer") {
        const specialties =
          typeof body.specialties === "string"
            ? body.specialties
                .split(",")
                .map((value: string) => value.trim())
                .filter(Boolean)
                .slice(0, 12)
            : [];
        const bustSize = optionalText(body.bustSize, 4);
        if (bustSize && !/^(?:28|3[02468]|4[02468]|5[02])(?:A|B|C|D|DD|E|EE)$/.test(bustSize)) {
          throw new Error("INVALID_MEASUREMENTS");
        }
        await transaction
          .update(profiles)
          .set({
            name,
            slug: username,
            location: location.label,
            imagePath: optionalText(body.imagePath, 500) ?? undefined,
            bio: sharedValues.bio,
            experienceYears: Math.max(
              0,
              Math.min(80, Number.parseInt(String(body.experienceYears ?? 0), 10) || 0),
            ),
            height:
              member.primaryRole === "model"
                ? (() => {
                    const feet = Number(body.heightFeet);
                    const inches = Number(body.heightInches);
                    if (!Number.isInteger(feet) || !Number.isInteger(inches) || feet < 4 || feet > 6 || inches < 0 || inches > 11 || (feet === 6 && inches > 7)) {
                      throw new Error("INVALID_HEIGHT");
                    }
                    return `${feet}′${inches}″`;
                  })()
                : null,
            measurements: optionalText(body.measurements, 80),
            bustSize: member.primaryRole === "model" ? bustSize : null,
            waistInches: member.primaryRole === "model" ? optionalInteger(body.waistInches, 18, 52) : null,
            hipInches: member.primaryRole === "model" ? optionalInteger(body.hipInches, 24, 62) : null,
            showBustSize: member.primaryRole === "model" ? body.showBustSize === true : true,
            showWaist: member.primaryRole === "model" ? body.showWaist === true : true,
            showHips: member.primaryRole === "model" ? body.showHips === true : true,
            hairColor: optionalText(body.hairColor, 60),
            eyeColor: optionalText(body.eyeColor, 60),
            specialties,
            portfolioUrl: sharedValues.portfolioUrl,
            xUrl: normalizeSocialProfile("x", body.xUrl),
            instagramUrl: normalizeSocialProfile("instagram", body.instagramUrl),
            youtubeUrl: normalizeSocialProfile("youtube", body.youtubeUrl),
            onlyfansUrl: normalizeSocialProfile("onlyfans", body.onlyfansUrl),
            customUrl: optionalUrl(body.customUrl),
            isAvailable: Boolean(body.isAvailable),
            isPublished: Boolean(body.isPublished),
            updatedAt: new Date(),
          })
          .where(eq(profiles.memberId, member.id));
      }

      if (member.primaryRole === "sponsor") {
        const [membership] = await transaction
          .select({ sponsorId: sponsorMembers.sponsorId })
          .from(sponsorMembers)
          .where(eq(sponsorMembers.memberId, member.id))
          .limit(1);
        if (membership) {
          await transaction
            .update(sponsors)
            .set({
              name: edits("company") ? sharedValues.organization ?? name : undefined,
              category: edits("company") ? optionalText(body.category, 100) ?? "Brand partner" : undefined,
              contactEmail: member.email,
              websiteUrl: sharedValues.websiteUrl,
              description: sharedValues.bio,
              location: edits("company") ? location.label : undefined,
              logoPath: !section ? optionalText(body.logoPath, 500) : undefined,
              contactName: edits("contact") ? optionalText(body.contactName, 120) ?? name : undefined,
              contactPhone: edits("contact") ? optionalText(body.contactPhone, 40) ?? "" : undefined,
              sponsorLevel: sponsorMembershipLevel,
              preferredPlacement: edits("brand") ? optionalText(body.preferredPlacement, 500) ?? "" : undefined,
              preferredLogoSize: edits("brand") ? optionalText(body.preferredLogoSize, 160) ?? "" : undefined,
              brandGuidelines: edits("brand") ? optionalText(body.brandGuidelines, 1800) ?? "" : undefined,
              logoUsageApproved: edits("brand") ? body.logoUsageApproved === true : undefined,
              sponsorshipStartsOn: edits("brand") ? optionalText(body.sponsorshipStartsOn, 10) : undefined,
              sponsorshipEndsOn: edits("brand") ? optionalText(body.sponsorshipEndsOn, 10) : undefined,
              requiredWording: edits("brand") ? optionalText(body.requiredWording, 1800) ?? "" : undefined,
              trackingUrl: edits("brand") ? optionalUrl(body.trackingUrl) : undefined,
              updatedAt: new Date(),
            })
            .where(eq(sponsors.id, membership.sponsorId));
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if(error instanceof Error && error.message.startsWith("PROFILE_CREDITS_REQUIRED:")) return NextResponse.json({error:`This change needs ${error.message.split(":")[1]} credits. Purchase credits in Settings to continue.`},{status:402});
    if (error instanceof Error && error.message === "INVALID_HEIGHT") {
      return NextResponse.json({ error: "Choose a model height between 4′0″ and 6′7″." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_MEASUREMENTS") {
      return NextResponse.json({ error: "Choose measurements from the available ranges." }, { status: 400 });
    }
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "That public profile URL is already in use." }, { status: 409 });
    }
    console.error("Profile update failed", error);
    return NextResponse.json(
      { error: "Check the profile fields and use complete http(s) links." },
      { status: 400 },
    );
  }
}
