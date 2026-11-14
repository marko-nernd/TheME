"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HostRequestActions({
  participationId,
  status,
  participantName,
}: {
  participationId: string;
  status: string;
  participantName: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function decide(action: "approve" | "decline" | "remove") {
    if (action === "remove" && !window.confirm(`Remove ${participantName} from this event? This does not automatically issue a Stripe refund.`)) {
      return;
    }
    setSaving(true);
    setError("");
    const response = await fetch(
      `/api/host/participations/${participationId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not update.");
      setSaving(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="host-request-actions">
      {status === "pending" && <>
        <button type="button" onClick={() => decide("approve")} disabled={saving}>
          Approve
        </button>
        <button type="button" onClick={() => decide("decline")} disabled={saving}>
          Decline
        </button>
      </>}
      <button className="host-participant-remove" type="button" onClick={() => decide("remove")} disabled={saving}>
        {saving ? "Updating…" : "Remove"}
      </button>
      {error && <small>{error}</small>}
    </div>
  );
}
