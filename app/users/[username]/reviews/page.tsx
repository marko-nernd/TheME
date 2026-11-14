import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/back-button";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getMemberReviewsByUsername } from "@/db/queries";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCurrentMember } from "@/lib/auth";
import { primaryRoleLabel } from "@/lib/roles";
import { isHostRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

function profileHref(username: string | null, profileSlug: string | null) {
  if (profileSlug) return `/members/${profileSlug}`;
  return username ? `/users/${username}` : "#";
}

function avatarSource(memberId: string, avatarUpdatedAt: Date | null, imagePath: string | null) {
  return avatarUpdatedAt
    ? `/api/members/${memberId}/avatar?v=${avatarUpdatedAt.getTime()}`
    : imagePath;
}

export default async function MemberReviewsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = (await params).username;
  const [data, currentAdmin, currentMember] = await Promise.all([
    getMemberReviewsByUsername(username),
    getCurrentAdmin(),
    getCurrentMember(),
  ]);
  const canView = Boolean(
    currentAdmin ||
    isHostRole(currentMember?.primaryRole),
  );
  if (!canView) notFound();
  if (!data) notFound();
  const { member, reviews } = data;
  const memberSource = avatarSource(member.id, member.avatarUpdatedAt, member.imagePath);
  const average = reviews.length
    ? reviews.reduce((total, review) => total + review.overallRating, 0) / reviews.length
    : null;

  return (
    <main>
      <SiteHeader inner />
      <BackButton fallback={profileHref(member.username, member.profileSlug)} />
      <section className="member-reviews-hero" id="top">
        <div className="member-reviews-identity">
          <Link href={profileHref(member.username, member.profileSlug)} aria-label={`Open ${member.name}'s profile`}>
            {memberSource
              ? <Image unoptimized src={memberSource} alt={`${member.name} profile`} width={112} height={112} />
              : <span>{member.name.slice(0, 1).toUpperCase()}</span>}
          </Link>
          <div>
            <p className="eyebrow light"><span />Verified collaboration history</p>
            <h1>{member.name} reviews.</h1>
            <p>{primaryRoleLabel(member.primaryRole)} · {reviews.length} published {reviews.length === 1 ? "review" : "reviews"}{average ? ` · ${average.toFixed(1)}/10 average` : ""}</p>
          </div>
        </div>
      </section>
      <section className="member-reviews-list">
        {reviews.length ? reviews.map((review) => {
          const reviewerSource = avatarSource(review.reviewerId, review.reviewerAvatarUpdatedAt, review.reviewerImagePath);
          return (
            <article key={review.id}>
              <header>
                <div>
                  <strong>{review.overallRating}/10</strong>
                  <span>Verified rating</span>
                </div>
                <time dateTime={review.createdAt.toISOString()}>
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(review.createdAt)}
                </time>
              </header>
              <div className="member-review-scores">
                <span>Reliability <b>{review.reliabilityRating}/10</b></span>
                <span>Professionalism <b>{review.professionalismRating}/10</b></span>
                <span>{review.wouldWorkAgain ? "Would work together again" : "Would not work together again"}</span>
                {review.noShow && <span className="rating-flake-flag">Missed confirmed commitment</span>}
              </div>
              {review.comment && <blockquote>{review.comment}</blockquote>}
              <footer>
                <Link href={profileHref(review.reviewerUsername, review.reviewerProfileSlug)} className="member-review-reviewer">
                  {reviewerSource
                    ? <Image unoptimized src={reviewerSource} alt={`${review.reviewerName} profile`} width={38} height={38} />
                    : <span>{review.reviewerName.slice(0, 1).toUpperCase()}</span>}
                  <span>Reviewed by <strong>{review.reviewerName}</strong></span>
                </Link>
                <Link href={`/events/${review.eventSlug}`}>{review.eventTitle} ↗</Link>
              </footer>
            </article>
          );
        }) : (
          <div className="member-reviews-empty">
            <h2>No published reviews yet.</h2>
            <p>Verified collaboration reviews will appear here after moderation.</p>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
