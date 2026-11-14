"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Profile = { id: string; name: string; username: string | null; slug: string; role: string };
export default function ComplimentaryEventPlace({ eventId, admin = false }: { eventId: string; admin?: boolean }) {
 const router = useRouter(); const [query, setQuery] = useState(""); const [results, setResults] = useState<Profile[]>([]); const [selected, setSelected] = useState<Profile | null>(null); const [searching, setSearching] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
 const endpoint = `/api/${admin ? "admin" : "host"}/events/${eventId}/complimentary`;
 useEffect(() => {
  const controller = new AbortController();
  if (query.trim().length < 2 || selected) { setResults([]); setSearching(false); return; }
  setSearching(true);
  const timer = window.setTimeout(async () => { try { const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { signal: controller.signal }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResults(data.profiles); } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Could not search profiles."); } finally { if (!controller.signal.aborted) setSearching(false); } }, 300);
  return () => { controller.abort(); window.clearTimeout(timer); };
 }, [query, selected, endpoint]);
 async function add() {
  if (!selected || saving) return; setSaving(true); setMessage("");
  try { const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: selected.id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage(`${data.name} has been added at no charge.`); setSelected(null); setQuery(""); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add participant."); } finally { setSaving(false); }
 }
 return <section className="complimentary-event-place full" aria-label="Add complimentary participant"><h3>Add a model or photographer for free</h3><p>Find their profile, select the right person, and confirm a complimentary event place. Accommodation is not included. Attendance is verified separately at check-in.</p><label>Profile name or username<input value={query} placeholder="Start typing a profile name…" disabled={saving} autoComplete="off" onChange={(event) => { setQuery(event.target.value); setSelected(null); setResults([]); setMessage(""); }} /></label>{searching && <p role="status">Searching profiles…</p>}{!searching && query.trim().length >= 2 && !selected && !results.length && <p>No matching profiles.</p>}<ul className="complimentary-profile-results">{results.map((profile) => <li key={profile.id}><button type="button" disabled={saving} onClick={() => { setSelected(profile); setQuery(profile.name); setResults([]); }}><strong>{profile.name}</strong><span>{profile.role} · @{profile.username || profile.slug}</span></button></li>)}</ul>{selected && <p><strong>{selected.name}</strong> · {selected.role} · $0 event admission</p>}<button className="button" type="button" disabled={!selected || saving} onClick={add}>{saving ? "Adding…" : "Add complimentary place"}</button>{message && <p role="status">{message}</p>}</section>;
}
