"use client";
import { useEffect, useState, type FormEvent } from "react";
export default function EventRefundRequest({ transactionId }: { transactionId: string }) {
  const [state, setState] = useState<{ eligible: boolean; request: { status: string; decisionNote: string } | null } | null>(null);
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; fetch(`/api/event-transactions/${transactionId}/refund`, { cache: "no-store" }).then(async (r) => { if (active && r.ok) setState(await r.json()); }).catch(() => setMessage("Refund information is temporarily unavailable.")); return () => { active = false; }; }, [transactionId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const reason = new FormData(event.currentTarget).get("reason"); setSaving(true); setMessage("");
    try { const r = await fetch(`/api/event-transactions/${transactionId}/refund`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }); const result = await r.json(); if (!r.ok) throw new Error(result.error); setState({ eligible: false, request: { status: "requested", decisionNote: "" } }); setMessage("Request sent to the host. No refund has been issued yet."); } catch (e) { setMessage(e instanceof Error ? e.message : "Please retry."); } finally { setSaving(false); }
  }
  return <section className="pass-refund"><h2>Refunds</h2>{state?.request ? <p>Request status: <strong>{state.request.status.replaceAll("_", " ")}</strong>{state.request.decisionNote && ` · ${state.request.decisionNote}`}</p> : state?.eligible ? <details><summary>Request a refund</summary><form onSubmit={submit}><label>Reason<textarea name="reason" required minLength={10} maxLength={1000} rows={3} /></label><p>The host reviews your request. Your booking stays unchanged until a refund is processed.</p><button className="button" disabled={saving}>{saving ? "Sending…" : "Send refund request"}</button></form></details> : state && <p>This payment is outside the event’s refund terms or already being refunded. Message the host if you need help.</p>}{message && <p role="status">{message}</p>}</section>;
}
