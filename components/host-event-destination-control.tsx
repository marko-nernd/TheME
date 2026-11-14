"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function HostEventDestinationControl({
  eventId,
  initialUrl,
  initialRedirect,
}: {
  eventId: string;
  initialUrl: string | null;
  initialRedirect: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [redirect, setRedirect] = useState(initialRedirect);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/host/events/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ externalEventUrl: url, redirectToExternal: redirect }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not update.");
      return;
    }
    setMessage("Event destination updated.");
    router.refresh();
  }

  return (
    <details className="host-event-destination-control">
      <summary>Website and checkout</summary>
      <form onSubmit={submit}>
        <label>External event website<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></label>
        <label className="dashboard-check"><input type="checkbox" checked={redirect} onChange={(event) => setRedirect(event.target.checked)} /> Redirect visitors to this website</label>
        <p>Keep redirect off to use Model Escape checkout. Customers see and pay the booking and processing fee before checkout.</p>
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save destination"}</button>
        {message && <small role="status">{message}</small>}
      </form>
    </details>
  );
}
