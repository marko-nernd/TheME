"use client";
import { type FormEvent, useEffect, useState } from "react";
type Flight = { participationId: string; name: string; role: string; airline: string; flightNumber: string; arrivalLocal: string; departureLocal: string; timezone: string; notes: string; updatedAt: string };
type FlightForm = Pick<Flight, "airline" | "flightNumber" | "arrivalLocal" | "departureLocal" | "timezone" | "notes">;
export default function AttendeeFlightDetails({ eventId, timezone = "", manager = false, guest }: { eventId: string; timezone?: string; manager?: boolean; guest?: { id: string; token: string } }) {
  const [items, setItems] = useState<Flight[]>([]);
  const [form, setForm] = useState<FlightForm>({ airline: "", flightNumber: "", arrivalLocal: "", departureLocal: "", timezone, notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => { setLoading(true); setFailed(false); setRefreshKey((key) => key + 1); };
  const guestId = guest?.id, guestToken = guest?.token;
  const headers = () => ({ ...(guestId && guestToken ? { "x-guest-booking": guestId, "x-guest-token": guestToken } : {}), "content-type": "application/json" });
  useEffect(() => {
    let active = true;
    const authHeaders = guestId && guestToken ? { "x-guest-booking": guestId, "x-guest-token": guestToken } : undefined;
    fetch(`/api/events/${eventId}/flights${manager ? "" : "?mine=1"}`, { cache: "no-store", headers: authHeaders }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Flight details could not be loaded.");
      if (!active) return;
      setItems(result.items);
      if (!manager && result.items[0]) setForm(result.items[0]);
    }).catch((error) => { if (active) { setMessage(error.message); setFailed(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventId, guestId, guestToken, manager, refreshKey]);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/flights`, { method: "PUT", headers: headers(), body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Flight details could not be saved.");
      setMessage("Your private flight details have been saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!window.confirm("Remove your submitted flight details from this event?")) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/events/${eventId}/flights`, { method: "DELETE", headers: headers() });
      if (!response.ok) throw new Error("Flight details could not be removed.");
      setForm({ airline: "", flightNumber: "", arrivalLocal: "", departureLocal: "", timezone, notes: "" }); setItems([]); setMessage("Your flight details were removed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setSaving(false); }
  }
  if (loading) return <p role="status">Loading private flight details…</p>;
  if (failed) return <div><p role="alert">{message}</p><button type="button" onClick={refresh}>Try again</button></div>;
  if (manager) {
    const pages = Math.max(1, Math.ceil(items.length / 20));
    return <section className="flight-manifest"><h3>Attendee flight details</h3><button className="flight-manifest-refresh" type="button" onClick={refresh}>Refresh flight details</button><p>Private travel information shared with you as the event host or admin. Times use each traveler’s stated timezone.</p>{items.slice((page - 1) * 20, page * 20).map((flight) => <details key={flight.participationId}><summary><strong>{flight.name}</strong><span>{flight.airline} {flight.flightNumber}</span></summary><dl><div><dt>Arrival</dt><dd>{flight.arrivalLocal.replace("T", " ")} · {flight.timezone}</dd></div>{flight.departureLocal && <div><dt>Departure</dt><dd>{flight.departureLocal.replace("T", " ")} · {flight.timezone}</dd></div>}{flight.notes && <div><dt>Travel note</dt><dd>{flight.notes}</dd></div>}<div><dt>Last updated</dt><dd>{new Date(flight.updatedAt).toLocaleString()}</dd></div></dl></details>)}{!items.length && <p>No attendees have shared flight details yet.</p>}{pages > 1 && <nav aria-label="Flight details pages"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {pages}</span><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button></nav>}</section>;
  }
  return <details className="my-flight-details"><summary>My private flight details</summary><p>Only you, this event’s host, and admins can see these details. Do not enter passport numbers, booking references, or payment information.</p><form onSubmit={save} className="travel-editor-grid"><label>Airline<input maxLength={120} value={form.airline} onChange={(event) => setForm({ ...form, airline: event.target.value })} /></label><label>Flight number<input required maxLength={20} value={form.flightNumber} onChange={(event) => setForm({ ...form, flightNumber: event.target.value })} /></label><label>Arrival at destination (local date/time)<input required type="datetime-local" value={form.arrivalLocal} onChange={(event) => setForm({ ...form, arrivalLocal: event.target.value })} /></label><label>Departure from destination (optional)<input type="datetime-local" min={form.arrivalLocal} value={form.departureLocal} onChange={(event) => setForm({ ...form, departureLocal: event.target.value })} /></label><label className="full">Destination timezone<input required maxLength={80} placeholder="America/Costa_Rica" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></label><label className="full">Transfer / luggage note (optional)<textarea rows={3} maxLength={1000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="full flight-form-actions"><button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save private flight details"}</button><button type="button" onClick={remove} disabled={saving || (!items.length && !form.flightNumber)}>Remove my details</button></div>{message && <p className="full" role="status">{message}</p>}</form></details>;
}
