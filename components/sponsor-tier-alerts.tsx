"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SponsorTierAlerts({ changes }: { changes: Array<{ id: string; previousLevel: string; requestedLevel: string; createdAt: string }> }) {
  const router = useRouter(); const [busy, setBusy] = useState("");
  async function decide(id: string, action: "accept" | "decline") {
    setBusy(id); await fetch(`/api/account/sponsor-tier-changes/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }); setBusy(""); router.refresh();
  }
  if (!changes.length) return null;
  return <section className="sponsor-tier-alerts">{changes.map((change) => <article key={change.id}>
    <div><strong>Membership level change requested</strong><p>Admin proposes changing your sponsor membership from {change.previousLevel} to {change.requestedLevel}. Your level will not change until you accept.</p><small>{new Date(change.createdAt).toLocaleString()}</small></div>
    <div><button disabled={busy === change.id} onClick={() => decide(change.id, "decline")}>Decline</button><button className="button" disabled={busy === change.id} onClick={() => decide(change.id, "accept")}>Accept change</button></div>
  </article>)}</section>;
}
