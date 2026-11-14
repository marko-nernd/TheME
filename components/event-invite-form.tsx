"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function EventInviteForm({
  recipientMemberId,
  recipientName,
  events,
  cooldowns,
}: {
  recipientMemberId: string;
  recipientName: string;
  events: { id: string; title: string; location: string; startsAt: Date }[];
  cooldowns: { eventId: string; retryAt: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [locks, setLocks] = useState(cooldowns);
  const selectedLock = useMemo(
    () => locks.find((lock) => lock.eventId === selectedEventId),
    [locks, selectedEventId],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const selected = events.find((item) => item.id === values.eventId);
    const response = await fetch("/api/collaborations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipientMemberId,
        eventId: values.eventId,
        subject: `Invitation to ${selected?.title ?? "an event"}`,
        message: values.message,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setStatus(result.error ?? "Could not send the invitation.");
      if (result.retryAt && selectedEventId) {
        setLocks((current) => [
          ...current.filter((lock) => lock.eventId !== selectedEventId),
          { eventId: selectedEventId, retryAt: result.retryAt },
        ]);
      }
      setSaving(false);
      return;
    }
    setStatus(`Invitation sent to ${recipientName}.`);
    setLocks((current) => [
      ...current.filter((lock) => lock.eventId !== selectedEventId),
      { eventId: selectedEventId, retryAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() },
    ]);
    setSaving(false);
    router.refresh();
  }

  return (
    <form className={`event-invite-form ${selectedLock ? "is-cooling-down" : ""}`} onSubmit={submit}>
      <label>
        Choose one of your events
        <select name="eventId" required value={selectedEventId} onChange={(event) => {
          setSelectedEventId(event.target.value);
          setStatus("");
        }}>
          <option value="" disabled>Select an event</option>
          {events.map((event) => (
            <option value={event.id} key={event.id}>
              {event.title} · {event.location} · {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(event.startsAt))}
              {locks.some((lock) => lock.eventId === event.id) ? " · invite sent" : ""}
            </option>
          ))}
        </select>
      </label>
      <fieldset disabled={Boolean(selectedLock)}>
      <label>
        Invitation message
        <textarea
          name="message"
          required
          minLength={20}
          maxLength={2000}
          rows={6}
          defaultValue={`Hi ${recipientName}, I would like to invite you to collaborate on this event. Please review the event details and let me know if you are interested.`}
        />
        <small>Include the role, compensation, schedule, and what you need from them.</small>
      </label>
      <button className="button" type="submit" disabled={saving || !selectedEventId}>
        {saving ? "Sending…" : "Send event invitation ↗"}
      </button>
      </fieldset>
      {selectedLock && (
        <p className="invite-cooldown" role="status">
          Invitation sent. This form is locked until{" "}
          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(selectedLock.retryAt))}.
        </p>
      )}
      {status && <p role="status">{status}</p>}
    </form>
  );
}
