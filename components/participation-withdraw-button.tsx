"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ParticipationWithdrawButton({
  participationId,
  eventTitle,
}: {
  participationId: string;
  eventTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
    const response = await fetch(`/api/event-participations/${participationId}/withdraw`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not decline this participation.");
      setSaving(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="participation-withdraw-trigger" type="button" onClick={() => setOpen(true)}>
        Cancel my attendance
      </button>
      {open && (
        <div className="withdraw-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <form className="withdraw-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby={`withdraw-${participationId}`}>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            <span>CANCEL ATTENDANCE</span>
            <h2 id={`withdraw-${participationId}`}>{eventTitle}</h2>
            <p>The host will see your cancellation and reason. This releases your place and deactivates your pass. Canceling does not automatically issue a refund; use the refund request on your event pass first if eligible.</p>
            <label>Reason for declining<textarea name="reason" minLength={5} maxLength={500} rows={5} required /></label>
            {error && <small role="alert">{error}</small>}
            <button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Confirm cancellation"}</button>
          </form>
        </div>
      )}
    </>
  );
}
