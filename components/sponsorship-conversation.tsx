"use client";

import { FormEvent, useState } from "react";

type Message = { id: string; senderName: string; senderMemberId: string | null; body: string; createdAt: string | Date };

export default function SponsorshipConversation({ requestId, currentMemberId, initialMessages }: { requestId: string; currentMemberId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [value, setValue] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function send(event: FormEvent) {
    event.preventDefault(); if (value.trim().length < 2) return;
    setSaving(true); setError("");
    const response = await fetch(`/api/sponsorship-requests/${requestId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: value }) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setError(result.error || "Message could not be sent.");
    setMessages((current) => [...current, result.message]); setValue("");
  }
  return <section className="sponsorship-conversation"><header><span>SHARED THREAD</span><h2>Conversation</h2></header>
    <div className="sponsorship-message-list">{messages.length ? messages.map((message) => <article className={message.senderMemberId === currentMemberId ? "is-mine" : ""} key={message.id}><strong>{message.senderName}</strong><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleString()}</small></article>) : <p>No messages yet. Use this thread so decisions stay attached to the sponsorship.</p>}</div>
    <form onSubmit={send}><label>Message<textarea rows={4} maxLength={2000} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask a question or clarify the offer." /></label><button className="button" disabled={saving || value.trim().length < 2}>{saving ? "Sending…" : "Send message ↗"}</button>{error && <p className="form-error">{error}</p>}</form>
  </section>;
}
