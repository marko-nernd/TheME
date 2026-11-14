"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

export type AdminRatingRow = {
  id: string;
  overallRating: number;
  reliabilityRating: number;
  professionalismRating: number;
  wouldWorkAgain: boolean;
  noShow: boolean;
  comment: string;
  status: string;
  eventTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerUsername: string | null;
  reviewerAvatarVersion: number | null;
  reviewerProfileSlug: string | null;
  reviewerImagePath: string | null;
  reviewedId: string;
  reviewedName: string;
  reviewedUsername: string | null;
  reviewedRole: string;
  reviewedAvatarVersion: number | null;
  reviewedProfileSlug: string | null;
  reviewedImagePath: string | null;
  createdAt: string;
};

function profileHref(username: string | null, profileSlug: string | null) {
  if (profileSlug) return `/members/${profileSlug}`;
  return username ? `/users/${username}` : null;
}

function reviewHistoryHref(username: string | null, profileSlug: string | null) {
  return username ? `/users/${username}/reviews` : profileHref(username, profileSlug) ?? "#";
}

function RatingAvatar({
  memberId,
  name,
  username,
  profileSlug,
  avatarVersion,
  imagePath,
  size,
  hrefOverride,
}: {
  memberId: string;
  name: string;
  username: string | null;
  profileSlug: string | null;
  avatarVersion: number | null;
  imagePath: string | null;
  size: "reviewed" | "reviewer";
  hrefOverride?: string;
}) {
  const href = hrefOverride ?? profileHref(username, profileSlug);
  const source = avatarVersion ? `/api/members/${memberId}/avatar?v=${avatarVersion}` : imagePath;
  const linkLabel = hrefOverride ? `View all reviews for ${name}` : `Open ${name}'s profile`;
  const content = source
    ? <Image unoptimized src={source} alt={`${name} profile`} width={size === "reviewed" ? 56 : 28} height={size === "reviewed" ? 56 : 28} />
    : <b>{name.slice(0, 1).toUpperCase()}</b>;
  if (!href) return <span className={`rating-avatar rating-avatar-${size}`}>{content}</span>;
  return <Link className={`rating-avatar rating-avatar-${size}`} href={href} aria-label={linkLabel}>{content}</Link>;
}

export default function AdminRatingManager({ initialRatings }: { initialRatings: AdminRatingRow[] }) {
  const [ratings, setRatings] = useState(initialRatings);
  const [editing, setEditing] = useState<AdminRatingRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const update = {
      overallRating: Number(data.get("overallRating")),
      reliabilityRating: Number(data.get("reliabilityRating")),
      professionalismRating: Number(data.get("professionalismRating")),
      wouldWorkAgain: data.get("wouldWorkAgain") === "on",
      noShow: data.get("noShow") === "on",
      comment: String(data.get("comment") ?? ""),
      status: String(data.get("status") ?? ""),
    };
    const response = await fetch(`/api/admin/reviews/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(update),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not update the rating.");
      setSaving(false);
      return;
    }
    setRatings((current) => current.map((rating) => rating.id === editing.id ? { ...rating, ...update } : rating));
    setEditing(null);
    setSaving(false);
  }

  return (
    <div className="admin-rating-manager">
      <div className="admin-heading"><div><p className="astryx-kicker">REPUTATION MODERATION</p><h2>Verified ratings</h2></div><span className="admin-count">{ratings.filter((rating) => rating.status === "pending_moderation").length} pending</span></div>
      <div className="admin-management-table">
        <table>
          <thead><tr><th>Member</th><th>Event</th><th>Scores</th><th>Reliability</th><th>Reviewed</th><th>Status</th><th /></tr></thead>
          <tbody>{ratings.map((rating) => (
            <tr key={rating.id}>
              <td>
                <div className="admin-rating-member">
                  <RatingAvatar memberId={rating.reviewedId} name={rating.reviewedName} username={rating.reviewedUsername} profileSlug={rating.reviewedProfileSlug} avatarVersion={rating.reviewedAvatarVersion} imagePath={rating.reviewedImagePath} size="reviewed" hrefOverride={reviewHistoryHref(rating.reviewedUsername, rating.reviewedProfileSlug)} />
                  <span>
                    <Link href={reviewHistoryHref(rating.reviewedUsername, rating.reviewedProfileSlug)}><strong>{rating.reviewedName}</strong></Link>
                    <small>{rating.reviewedRole}</small>
                    <span className="admin-rating-reviewer">
                      <span>Reviewed by {rating.reviewerName}</span>
                      <RatingAvatar memberId={rating.reviewerId} name={rating.reviewerName} username={rating.reviewerUsername} profileSlug={rating.reviewerProfileSlug} avatarVersion={rating.reviewerAvatarVersion} imagePath={rating.reviewerImagePath} size="reviewer" />
                    </span>
                  </span>
                </div>
              </td>
              <td>{rating.eventTitle}</td>
              <td><strong>{rating.overallRating}/10</strong><small>Reliability {rating.reliabilityRating} · Professionalism {rating.professionalismRating}</small></td>
              <td>{rating.noShow ? <strong className="rating-flake-flag">Missed commitment</strong> : rating.wouldWorkAgain ? "Would work again" : "Would not work again"}</td>
              <td><time dateTime={rating.createdAt}>{new Date(rating.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></td>
              <td><span className={`rating-status status-${rating.status}`}>{rating.status.replaceAll("_", " ")}</span></td>
              <td><button type="button" onClick={() => setEditing(rating)}>Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing && (
        <div className="admin-editor-backdrop" onMouseDown={() => !saving && setEditing(null)}>
          <section className="admin-editor" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p className="astryx-kicker">RATING MODERATION</p><h2>{editing.reviewedName}</h2></div><button type="button" onClick={() => setEditing(null)}>×</button></header>
            <form className="admin-editor-form" onSubmit={save}>
              {(["overallRating", "reliabilityRating", "professionalismRating"] as const).map((name) => <label key={name}>{name.replace("Rating", "")}<input type="number" name={name} min="1" max="10" defaultValue={editing[name]} required /></label>)}
              <label>Status<select name="status" defaultValue={editing.status}><option value="pending_moderation">Pending moderation</option><option value="published">Published</option><option value="hidden">Hidden</option></select></label>
              <label className="admin-checkbox"><input type="checkbox" name="wouldWorkAgain" defaultChecked={editing.wouldWorkAgain} /> Would work again</label>
              <label className="admin-checkbox"><input type="checkbox" name="noShow" defaultChecked={editing.noShow} /> Missed confirmed commitment</label>
              <label className="full">Review context<textarea name="comment" rows={4} maxLength={500} defaultValue={editing.comment} /></label>
              {error && <p className="form-error full">{error}</p>}
              <div className="admin-editor-actions full"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save moderated rating"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
