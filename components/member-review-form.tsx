"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function MemberReviewForm({
  target,
}: {
  target: {
    eventId: string;
    eventTitle: string;
    memberId: string;
    name: string;
    role: string;
    reviewerIsHost: boolean;
  };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: target.eventId,
        reviewedMemberId: target.memberId,
        overallRating: Number(data.get("overallRating")),
        reliabilityRating: Number(data.get("reliabilityRating")),
        professionalismRating: Number(data.get("professionalismRating")),
        wouldWorkAgain: data.get("wouldWorkAgain") === "on",
        noShow: data.get("noShow") === "on",
        comment: data.get("comment"),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not save the review.");
      setSaving(false);
      return;
    }
    setMessage("Review saved.");
    setSaving(false);
    router.refresh();
  }

  return (
    <form className="member-review-form" onSubmit={submit}>
      <header><span>{target.role} · {target.eventTitle}</span><h3>{target.name}</h3></header>
      <div className="review-score-grid">
        <Score name="overallRating" label="Overall" />
        <Score name="reliabilityRating" label="Reliability" />
        <Score name="professionalismRating" label="Professionalism" />
      </div>
      <label className="review-check"><input name="wouldWorkAgain" type="checkbox" /> I would work with this person again</label>
      {target.reviewerIsHost && <label className="review-check"><input name="noShow" type="checkbox" /> Report a missed confirmed event commitment</label>}
      <aside className="flake-report-note" role="note">
        <strong>How flake reports work</strong>
        <ul>
          <li>The report must be connected to this completed, verified event.</li>
          <li>Include factual context about the call time, communication, and outcome.</li>
          <li>A flake report is held for administrator review and does not immediately affect the member’s public rate.</li>
          <li>Host check-in is attendance evidence. A missing scan alone does not prove a no-show; a checked-in attendee cannot be reported as a no-show.</li>
          <li>Administrators can correct or hide abusive reports. Only one review per person, event, and reviewer is allowed.</li>
          <li>Published reports remain linked to the event, and a public flake percentage appears only after three published reviews.</li>
        </ul>
      </aside>
      <label>Context for moderation<textarea name="comment" rows={3} maxLength={500} placeholder="Required for a missed-commitment report. Explain the call time, communication, and outcome." /></label>
      <button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Submit verified review ↗"}</button>
      {message && <small role="status">{message}</small>}
    </form>
  );
}

function Score({ name, label }: { name: string; label: string }) {
  return (
    <label>{label}
      <select name={name} required defaultValue="10">
        <option value="10">10 — Exceptional</option>
        <option value="9">9 — Excellent</option>
        <option value="8">8 — Very good</option>
        <option value="7">7 — Good</option>
        <option value="6">6 — Above average</option>
        <option value="5">5 — Average</option>
        <option value="4">4 — Below average</option>
        <option value="3">3 — Difficult</option>
        <option value="2">2 — Poor</option>
        <option value="1">1 — Unacceptable</option>
      </select>
    </label>
  );
}
