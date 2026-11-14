"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteEventButton({
  eventId,
  eventTitle,
  endpoint,
}: {
  eventId: string;
  eventTitle: string;
  endpoint: "admin" | "host";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setDeleting(true);
    setError("");
    const response = await fetch(`/api/${endpoint}/events/${eventId}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "The event could not be deleted.");
      setDeleting(false);
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  return (
    <>
      <button className="event-delete-trigger" type="button" onClick={() => setConfirming(true)}>
        Delete
      </button>
      {confirming && (
        <div
          className="delete-confirmation-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setConfirming(false);
          }}
        >
          <section
            className="delete-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-event-${eventId}`}
          >
            <p className="astryx-kicker">PERMANENT ACTION</p>
            <h2 id={`delete-event-${eventId}`}>Delete “{eventTitle}”?</h2>
            <p>
              This removes the event, participation requests, attending models,
              sponsorships, reviews, conversations, payment references, and all
              event-owned uploads. This cannot be undone.
            </p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div>
              <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>
                Keep event
              </button>
              <button type="button" onClick={remove} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, delete event"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
