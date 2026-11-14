"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CollaborationForm({
  collaborators,
  hostedEvents,
  roleLabel,
}: {
  collaborators: { id: string; name: string; role: string; market: string; profileSlug: string | null }[];
  hostedEvents: { id: string; title: string }[];
  roleLabel: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const memberTypes = [...new Set(collaborators.map((person) => person.role))].sort();
  const [memberType, setMemberType] = useState(memberTypes[0] ?? "");
  const [recipientId, setRecipientId] = useState("");
  const filteredCollaborators = collaborators.filter((person) => person.role === memberType);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
    const response = await fetch("/api/collaborations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not send the request.");
      setSaving(false);
      return;
    }
    form.reset();
    setRecipientId("");
    setMessage("Collaboration request sent.");
    setSaving(false);
    router.refresh();
    } catch { setMessage("Connection lost. Your message is still here. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <form className="collaboration-form" onSubmit={submit}>
      <span>START A CONVERSATION</span>
      <h3>Reach out as a {roleLabel.toLowerCase()}.</h3>
      <div className="collaboration-form-grid">
        <label>
          Member type
          <select value={memberType} onChange={(event) => { setMemberType(event.target.value); setRecipientId(""); }}>
            {memberTypes.map((type) => <option value={type} key={type}>{type.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>
          Member
          <select name="recipientMemberId" required value={recipientId} onChange={(event) => setRecipientId(event.target.value)}>
            <option value="" disabled>Choose a collaborator</option>
            {filteredCollaborators.map((person) => (
              <option value={person.id} key={person.id}>
                {person.name} · {person.role} · {person.market}
              </option>
            ))}
          </select>
        </label>
        {hostedEvents.length > 0 && (
          <label>
            Related event <small>Optional</small>
            <select name="eventId" defaultValue="">
              <option value="">General collaboration</option>
              {hostedEvents.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}
            </select>
          </label>
        )}
        <label className="full">
          Subject
          <input name="subject" required minLength={4} maxLength={120} placeholder="Campaign, booking, event, or partnership" />
        </label>
        <label className="full">
          Message
          <textarea name="message" required minLength={20} maxLength={2000} rows={5} placeholder="Share the scope, date, compensation, and expected outcome." />
        </label>
      </div>
      <button className="button" type="submit" disabled={saving}>{saving ? "Sending…" : "Send request ↗"}</button>
      {message && <p className="dashboard-form-message" role="status">{message}</p>}
    </form>
  );
}
