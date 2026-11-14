"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RequestDecisionActions({
  id,
  kind,
}: {
  id: string;
  kind: "collaboration" | "sponsorship";
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [responseAction, setResponseAction] = useState<"counter" | "decline" | null>(null);
  const [note, setNote] = useState("");

  async function decide(action: "accept" | "counter" | "decline") {
    setSaving(true);
    setError("");
    const endpoint =
      kind === "collaboration"
        ? `/api/collaborations/${id}`
        : `/api/sponsorship-requests/${id}`;
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not update.");
      setSaving(false);
      return;
    }
    setResponseAction(null);
    setNote("");
    router.refresh();
  }

  return (
    <div className="request-decision-actions">
      <button type="button" disabled={saving} onClick={() => decide("accept")}>Accept</button>
      <button type="button" disabled={saving} onClick={() => setResponseAction("counter")}>Counter</button>
      <button type="button" disabled={saving} onClick={() => setResponseAction("decline")}>Decline</button>
      {responseAction && <div className="request-response-editor"><label>{responseAction === "counter" ? "Counteroffer" : "Reason for declining"}<textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={10} maxLength={2000} rows={4} placeholder={responseAction === "counter" ? "Describe the exact terms you would accept." : "Give the other party a clear, respectful reason."} /></label><div><button type="button" onClick={() => { setResponseAction(null); setNote(""); }}>Cancel</button><button type="button" disabled={saving || note.trim().length < 10} onClick={() => decide(responseAction)}>{saving ? "Saving…" : responseAction === "counter" ? "Send counteroffer" : "Decline request"}</button></div></div>}
      {error && <small>{error}</small>}
    </div>
  );
}
