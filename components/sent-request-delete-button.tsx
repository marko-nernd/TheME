"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SentRequestDeleteButton({
  requestId,
  recipientName,
}: {
  requestId: string;
  recipientName: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/collaborations/${requestId}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error ?? "Could not delete the request.");
      setSaving(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        className="sent-request-delete"
        type="button"
        onClick={() => setOpen(true)}
        disabled={saving}
        aria-label={`Delete declined request to ${recipientName}`}
        title="Move to Deleted"
      >
        ×
      </button>
      {open && (
        <div className="request-delete-backdrop" role="presentation" onMouseDown={() => !saving && setOpen(false)}>
          <section
            className="request-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-request-${requestId}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            <span>MOVE TO DELETED</span>
            <h2 id={`delete-request-${requestId}`}>Delete the request to {recipientName}?</h2>
            <p>It will remain in your Deleted folder for 30 days, then be permanently removed with its chat history.</p>
            {error && <small role="alert">{error}</small>}
            <div>
              <button type="button" onClick={() => setOpen(false)} disabled={saving}>Keep request</button>
              <button type="button" onClick={remove} disabled={saving}>{saving ? "Moving…" : "Move to Deleted"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
