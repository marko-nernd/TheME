"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
type Detector = { detect: (video: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
export default function HostCheckIn({ eventId }: { eventId: string }) {
  const [people, setPeople] = useState<Array<{ id: string; name: string; role: string; checkedInAt: string | null }>>([]);
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const busy = useRef(false);
  const refresh = useCallback(async () => { const r = await fetch(`/api/host/events/${eventId}/check-in`, { cache: "no-store" }); if (r.ok) setPeople((await r.json()).attendees); }, [eventId]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => { window.clearTimeout(timer); stream.current?.getTracks().forEach((track) => track.stop()); }; }, [refresh]);
  function stop() { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; setScanning(false); }
  useEffect(() => {
    const closeWhenHidden = () => { if (document.hidden || root.current?.closest("[hidden]")) stop(); };
    const observer = new MutationObserver(closeWhenHidden);
    for (let element = root.current?.parentElement; element; element = element.parentElement) observer.observe(element, { attributes: true, attributeFilter: ["hidden"] });
    document.addEventListener("visibilitychange", closeWhenHidden);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", closeWhenHidden); };
  }, []);
  async function check(value: string) {
    if (busy.current) return;
    busy.current = true; setSaving(true); setMessage("");
    try { const r = await fetch(`/api/host/events/${eventId}/check-in`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: value }) }); const result = await r.json(); if (!r.ok) throw new Error(result.error); setMessage(`✓ ${result.name} is checked in. Match the name to the person presenting the pass.`); setCode(""); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Check-in failed. Please retry."); }
    finally { busy.current = false; setSaving(false); }
  }
  async function start() {
    const Constructor = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!Constructor || !navigator.mediaDevices?.getUserMedia) { setMessage("Camera scanning is not supported by this browser. Enter the six-character code below, or use Chrome on a secure connection."); return; }
    try { stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }); setScanning(true); }
    catch { setMessage("Camera access was not granted. You can still use a confirmation code."); }
  }
  useEffect(() => {
    if (!scanning || !video.current || !stream.current) return;
    const Constructor = (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = new Constructor({ formats: ["qr_code"] });
    video.current.srcObject = stream.current; void video.current.play().catch(() => {});
    let active = true;
    const timer = window.setInterval(async () => { if (!video.current || video.current.readyState < 2 || busy.current) return; try { const [result] = await detector.detect(video.current); if (active && result) { stop(); setCode(result.rawValue); setMessage("QR captured. Match the attendee’s name after selecting Check in."); } } catch { /* A blurred frame can be retried. */ } }, 500);
    return () => { active = false; window.clearInterval(timer); };
  }, [scanning]);
  const filtered = people.filter((person) => person.name.toLowerCase().includes(query.toLowerCase()));
  return <section ref={root} className="host-check-in"><header><div><span>EVENT CHECK-IN</span><h3>{people.filter((person) => person.checkedInAt).length} of {people.length} checked in</h3><p>Only confirmed paid or free bookings can enter. Check-in is available from 24 hours before the event until 12 hours after it ends.</p></div><button type="button" className="button" onClick={scanning ? stop : start}>{scanning ? "Stop camera" : "Scan QR code"}</button></header>{scanning && <video ref={video} muted playsInline aria-label="QR scanner camera preview" />}<form onSubmit={(event: FormEvent) => { event.preventDefault(); void check(code); }}><label>Confirmation code or scanned QR<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="ABC123" required autoComplete="off" /></label><button className="button" type="submit" disabled={saving}>{saving ? "Checking…" : "Check in"}</button></form>{message && <p className="draft-status" role="status">{message}</p>}<label>Find an attendee<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search names" /></label><div className="check-in-people">{filtered.slice(page * 20, page * 20 + 20).map((person) => <article key={person.id}><strong>{person.name}</strong><span>{person.role}</span><span>{person.checkedInAt ? `Checked in · ${new Date(person.checkedInAt).toLocaleString()}` : "Not checked in"}</span></article>)}{!filtered.length && <p>No confirmed attendees match this search.</p>}</div>{filtered.length > 20 && <nav aria-label="Check-in attendee pages"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {Math.ceil(filtered.length / 20)}</span><button type="button" disabled={(page + 1) * 20 >= filtered.length} onClick={() => setPage(page + 1)}>Next</button></nav>}</section>;
}
