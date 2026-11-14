"use client";
import { useCallback, useEffect, useState } from "react";
import { useConfirmation } from "@/components/use-confirmation";
type Row = { id: string; reason: string; status: string; name: string | null; amountCents: number; confirmation: string; requestedAt: string };
export default function HostRefundQueue({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<Row[]>([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState<string | null>(null);
  const { ask, confirmationDialog } = useConfirmation();
  const refresh = useCallback(async () => { const r = await fetch(`/api/host/refunds?event=${eventId}`, { cache: "no-store" }); if (r.ok) setRows((await r.json()).requests); }, [eventId]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);
  async function decide(id: string, action: "approve" | "deny", note: string) {
    if (note.trim().length < 5) { setMessage("Add a short decision note for the member."); return; }
    if (!await ask({ title: action === "approve" ? "Issue this test refund?" : "Decline this refund request?", message: action === "approve" ? "This refunds the full customer total, including the service fee, and reverses a connected transfer when applicable. The pass becomes inactive. Stripe processing costs may not be returned to the platform. No live refunds are enabled." : "The member will see your decision note. Their payment and booking will not be changed.", confirmLabel: action === "approve" ? "Confirm test refund" : "Decline request" })) return;
    setBusy(id); setMessage("");
    try { const r = await fetch(`/api/host/refunds/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, note }) }); const result = await r.json(); if (!r.ok) throw new Error(result.error); setMessage("Refund request updated. Check the status below for Stripe confirmation."); await refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not update the refund."); } finally { setBusy(null); }
  }
  return <section className="host-refund-queue">{confirmationDialog}<h3>Refund requests</h3><p>Requests do not refund money automatically. Review the reason and issue or decline the test refund.</p>{rows.map((row) => <article key={row.id}><strong>{row.name ?? "Former member"} · {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amountCents / 100)}</strong><p>{row.reason}</p><small>{row.confirmation} · {row.status} · {new Date(row.requestedAt).toLocaleString()}</small>{["requested", "processing", "failed"].includes(row.status) && <form onSubmit={(event) => { event.preventDefault(); void decide(row.id, "approve", String(new FormData(event.currentTarget).get("note") ?? "")); }}><label>Decision note<textarea name="note" minLength={5} maxLength={1000} required rows={2} /></label><div><button className="button" disabled={busy === row.id}>{row.status === "processing" ? "Refresh test refund" : "Approve test refund"}</button>{row.status === "requested" && <button type="button" disabled={busy === row.id} onClick={(event) => { const form = event.currentTarget.closest("form"); void decide(row.id, "deny", String(new FormData(form ?? undefined).get("note") ?? "")); }}>Decline</button>}</div></form>}</article>)}{!rows.length && <p>No refund requests for this event.</p>}{message && <p className="draft-status" role="status">{message}</p>}</section>;
}
