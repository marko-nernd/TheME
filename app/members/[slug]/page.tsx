import type { Metadata } from "next";
import Image from "next/image";
import ProfilePortfolioGallery from "@/components/profile-portfolio-gallery";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import BackButton from "@/components/back-button";
import { getMemberReliabilityEvents, getMemberReviewSummary, getProfileBySlug, memberHasPaidAccess, portfolioLimits } from "@/db/queries";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCurrentMember } from "@/lib/auth";
import { canAccessFullModelProfile } from "@/lib/access-entitlements";
import { isHostRole } from "@/lib/roles";
import { memberPlaceholder } from "@/lib/member-placeholder";

export const dynamic = "force-dynamic";

const tierLabels = {
  profile: "Basic",
  creator: "Creator",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
} as const;

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatActivity(value: Date) {
  const days = Math.floor((Date.now() - value.getTime()) / 86400000);
  if (days <= 1) return "recently";
  if (days < 7) return "this week";
  if (days < 31) return "this month";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProfileBySlug(slug);
  if (!data) return { title: "Member not found — Model Escape" };
  return {
    title: `${data.profile.name} — Model Escape`,
    description: `${data.profile.role} based in ${data.profile.location}. View portfolio, specialties, and availability.`,
  };
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProfileBySlug(slug);
  if (!data) notFound();
  const { profile, portfolio, lastActiveAt, avatarUpdatedAt, username, isOnline } = data;
  const [rating, reliabilityEvents, currentMember, currentAdmin] = await Promise.all([
    getMemberReviewSummary(profile.memberId),
    getMemberReliabilityEvents(profile.memberId),
    getCurrentMember(),
    getCurrentAdmin(),
  ]);
  const canViewReviewHistory = Boolean(
    currentAdmin ||
    isHostRole(currentMember?.primaryRole),
  );
  const hasPaidAccess = currentMember ? await memberHasPaidAccess(currentMember.id) : false;
  const canViewFullProfile = profile.role !== "model" || canAccessFullModelProfile({
    viewerRole: currentMember?.primaryRole,
    viewerId: currentMember?.id,
    ownerId: profile.memberId,
    isAdmin: Boolean(currentAdmin),
    hasPaidAccess,
  });
  const tier = profile.membershipTier as keyof typeof tierLabels;
  const shotLimit = portfolioLimits[tier];
  const customSocialUrl = safeExternalUrl(profile.customUrl);
  const customSocialFor = (domain: string) => {
    if (!customSocialUrl) return null;
    try {
      return new URL(customSocialUrl).hostname.toLowerCase().includes(domain)
        ? customSocialUrl
        : null;
    } catch {
      return null;
    }
  };
  const socialLinks = [
    { label: "Instagram", icon: "◎", url: safeExternalUrl(profile.instagramUrl) },
    { label: "TikTok", icon: "♪", url: customSocialFor("tiktok") },
    { label: "YouTube", icon: "▶", url: safeExternalUrl(profile.youtubeUrl) },
    { label: "X", icon: "𝕏", url: safeExternalUrl(profile.xUrl) },
    { label: "Facebook", icon: "f", url: customSocialFor("facebook") },
    { label: "OnlyFans", icon: "OF", url: safeExternalUrl(profile.onlyfansUrl) },
  ].filter((item): item is { label: string; icon: string; url: string } => Boolean(item.url));

  return (
    <main>
      <SiteHeader inner />
      <BackButton fallback="/models" />
      <section className="member-profile-hero" id="top">
        <div className={`member-profile-portrait ${profile.isPremiumBlur ? "premium-blurred" : ""}`}>
          <Image
            unoptimized
            src={profile.imagePath}
            alt={`${profile.name}, ${profile.role}`}
            fill
            priority
            sizes="(max-width: 800px) 100vw, 48vw"
          />
          {profile.isPremiumBlur && (
            <div className="profile-privacy-gate">
              <strong>Pro privacy enabled</strong>
              <span>Full-resolution work is shared with approved members.</span>
            </div>
          )}
        </div>
        <div className="member-profile-intro">
          <div className="public-profile-avatar">
            <span>
              <Image
                unoptimized
                src={
                  profile.memberId && avatarUpdatedAt
                    ? `/api/members/${profile.memberId}/avatar?v=${avatarUpdatedAt.getTime()}`
                    : memberPlaceholder(profile.role)
                }
                alt={`${profile.name} profile photo`}
                width={82}
                height={82}
              />
              {isOnline && <i aria-label="Online now" title="Online now" />}
              {profile.isVerified && <b className="verified-image-badge" aria-label="Identity verified">✓</b>}
            </span>
          </div>
          <p className="eyebrow light"><span />{profile.role} profile</p>
          <div className="profile-badges">
            <span>{tierLabels[tier]} member</span>
            <span>{profile.isAvailable ? "Available" : "On assignment"}</span>
            {lastActiveAt && <span>Active {formatActivity(lastActiveAt)}</span>}
          </div>
          <h1>{profile.name}</h1>
          <p className="member-profile-location">{profile.location}</p>
          <p className="member-profile-bio">
            {canViewFullProfile ? (profile.bio || "This member is preparing their Model Escape profile.") : "Sign in with a paid Photographer or Host membership to view professional details and contact this model."}
          </p>
          {canViewFullProfile && <div className="member-profile-actions">
            <Link className="button button-light" href={`/sponsorships?member=${profile.slug}`}>
              Sponsor this {profile.role} ↗
            </Link>
            <Link className="quiet-link" href={`/invite/${profile.slug}`}>
              Invite to an event →
            </Link>
          </div>}
          {socialLinks.length > 0 && <div className="profile-social-links profile-hero-socials" aria-label={`${profile.name} social links`}>
            {socialLinks.map((item) => (
              <a href={item.url} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label} key={item.label}>
                <b>{item.icon}</b>
              </a>
            ))}
          </div>}
        </div>
      </section>

      {!canViewFullProfile && (
        <section className="profile-access-notice">
          <div><p className="eyebrow"><span />Member access</p><h2>Professional details are reserved for paid creative teams.</h2></div>
          <div><p>Free members can view this model’s public identity, location, availability, and social links. Upgrade an eligible Photographer or Host account to see measurements, portfolio work, reputation, and contact actions.</p><Link className="button" href={currentMember ? "/dashboard#billing" : "/login"}>{currentMember ? "View membership options ↗" : "Sign in ↗"}</Link></div>
        </section>
      )}

      {canViewFullProfile && <section className="profile-reputation-section">
        <div>
          <p className="eyebrow"><span />Verified event reputation</p>
          <h2>{rating ? `${rating.overall} out of 10.` : "No ratings yet."}</h2>
          <p>Ratings can only come from confirmed event collaborators after the event ends.</p>
        </div>
        <div className="profile-reputation-details">
          {rating ? (
            <>
            <dl className="reputation-metrics">
              <div><dt>Verified reviews</dt><dd>{rating.reviewCount}</dd></div>
              <div><dt>Reliability</dt><dd>{rating.reliability}/10</dd></div>
              <div><dt>Professionalism</dt><dd>{rating.professionalism}/10</dd></div>
              <div><dt>Would work again</dt><dd>{rating.wouldWorkAgainPercent}%</dd></div>
              <div>
                <dt>Verified flake rate</dt>
                <dd>{rating.reviewCount >= 3 ? `${rating.flakeRate}%` : "Shown after 3 reviews"}</dd>
              </div>
            </dl>
            {username && canViewReviewHistory && <Link className="reputation-review-link" href={`/users/${username}/reviews`}>Read all verified reviews ↗</Link>}
            </>
          ) : <div className="reputation-empty">Verified ratings appear after a completed event collaboration.</div>}
          {reliabilityEvents.length > 0 && <div className="profile-attending-events">
            <strong>Verified event participation</strong>
            {reliabilityEvents.length ? (
              <div className="reliability-event-list">
                {reliabilityEvents.map((event) => (
                  <article key={event.id}>
                    <div><Link href={`/events/${event.slug}`}>{event.title} ↗</Link><small>{event.location} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(event.starts_at)}</small></div>
                    <span>Attended</span>
                  </article>
                ))}
              </div>
            ) : <p>No public verified event participation yet.</p>}
          </div>}
        </div>
      </section>}

      {canViewFullProfile && <section className="profile-facts-section">
        <div>
          <p className="eyebrow"><span />Professional details</p>
          <h2>The information<br />behind the work.</h2>
        </div>
        <dl className="profile-facts">
          <div><dt>Primary role</dt><dd>{profile.role}</dd></div>
          <div><dt>Experience</dt><dd>{profile.experienceYears ? `${profile.experienceYears} years` : "Building experience"}</dd></div>
          {profile.role === "model" && (
            <>
              <div><dt>Height</dt><dd>{profile.height || "Not specified"}</dd></div>
              <div><dt>Bust / cup</dt><dd>{profile.showBustSize && profile.bustSize ? profile.bustSize : "Private"}</dd></div>
              <div><dt>Waist</dt><dd>{profile.showWaist && profile.waistInches ? `${profile.waistInches} in` : "Private"}</dd></div>
              <div><dt>Hips</dt><dd>{profile.showHips && profile.hipInches ? `${profile.hipInches} in` : "Private"}</dd></div>
              <div><dt>Hair</dt><dd>{profile.hairColor || "Not specified"}</dd></div>
              <div><dt>Eyes</dt><dd>{profile.eyeColor || "Not specified"}</dd></div>
            </>
          )}
          <div className="facts-wide">
            <dt>Specialties</dt>
            <dd className="specialty-list">
              {profile.specialties.length
                ? profile.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)
                : "Not specified"}
            </dd>
          </div>
          {profile.portfolioUrl && (
            <div className="facts-wide">
              <dt>Portfolio website</dt>
              <dd><a href={profile.portfolioUrl} target="_blank" rel="noreferrer">Visit external portfolio ↗</a></dd>
            </div>
          )}
        </dl>
      </section>}

      {canViewFullProfile && <section className="profile-portfolio-section">
        <div className="profile-portfolio-heading">
          <div>
            <p className="eyebrow light"><span />Selected work</p>
            <h2>{portfolio.length} portfolio {portfolio.length === 1 ? "shot" : "shots"}.</h2>
          </div>
          <div className="tier-capacity">
            <strong>{tierLabels[tier]}</strong>
            <span>{shotLimit === 0 ? "Hero image only · selected work stays empty" : `Up to ${shotLimit} published images`}</span>
            {tier !== "diamond" && <Link href="/membership">Unlock more portfolio space →</Link>}
          </div>
        </div>
        <ProfilePortfolioGallery name={profile.name} items={portfolio.map((item) => ({ id: item.id, imagePath: item.imagePath, hasUpload: Boolean(item.imageData), caption: item.caption, credit: item.credit, isPrivate: profile.isPremiumBlur || item.isPrivate }))} />
        {!portfolio.length && (
          <div className="profile-empty-portfolio">Portfolio work is being prepared.</div>
        )}
      </section>}

      {canViewFullProfile && <section className="profile-cta">
        <div>
          <p className="eyebrow"><span />Make the introduction</p>
          <h2>Build something<br />worth showing.</h2>
        </div>
        <div>
          <p>Send a sponsorship proposal or invite {profile.name} into a properly scoped event brief.</p>
          <Link className="button" href={`/sponsorships?member=${profile.slug}`}>Start a sponsorship ↗</Link>
        </div>
      </section>}
      <SiteFooter />
    </main>
  );
}
