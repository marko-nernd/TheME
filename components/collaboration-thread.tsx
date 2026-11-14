"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CollaborationThread({
  requestId,
  currentMemberId,
  messages,
  showMessages = true,
}: {
  requestId: string;
  currentMemberId: string;
  messages: {
    id: string;
    senderMemberId: string;
    senderName: string;
    body: string;
    createdAt: string;
  }[];
  showMessages?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const message = String(new FormData(form).get("message") ?? "");
    const response = await fetch(`/api/collaborations/${requestId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not send the message.");
      setSaving(false);
      return;
    }
    form.reset();
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="collaboration-thread">
      {showMessages && messages.length > 0 && (
        <div className="collaboration-message-list">
          {messages.map((message) => (
            <div className={message.senderMemberId === currentMemberId ? "is-mine" : ""} key={message.id}>
              <strong>{message.senderMemberId === currentMemberId ? "You" : message.senderName}</strong>
              <p>{message.body}</p>
              <small>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</small>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={send}>
        <label>
          Reply
          <textarea name="message" rows={2} maxLength={2000} required placeholder="Write a message…" />
        </label>
        <button type="submit" disabled={saving}>{saving ? "Sending…" : "Send ↗"}</button>
        {error && <small role="alert">{error}</small>}
      </form>
    </div>
  );
}
