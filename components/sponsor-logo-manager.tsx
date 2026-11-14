"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SponsorLogoManager({ sponsorId, filename, hasUpload }: { sponsorId: string; filename: string | null; hasUpload: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    const body = new FormData(); body.set("logo", file);
    const response = await fetch("/api/account/sponsor-logo", { method: "POST", body });
    const result = await response.json();
    setMessage(response.ok ? "Logo saved." : result.error);
    if (response.ok) router.refresh();
  }
  async function remove() {
    if (!confirm("Delete this uploaded sponsor logo?")) return;
    const response = await fetch("/api/account/sponsor-logo", { method: "DELETE" });
    setMessage(response.ok ? "Logo deleted." : "Logo could not be deleted.");
    if (response.ok) router.refresh();
  }
  return <section className="sponsor-logo-manager">
    <div><strong>High-resolution logo</strong><p>PNG, JPG, or SVG up to 15 MB. Event hosts can download the original file.</p></div>
    {hasUpload && <img src={`/api/sponsors/${sponsorId}/logo`} alt="Current sponsor logo" />}
    <label className="button">{hasUpload ? "Replace logo" : "Upload logo"}<input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={(event) => upload(event.target.files?.[0])} /></label>
    {hasUpload && <><a href={`/api/sponsors/${sponsorId}/logo?download=1`} download>{filename ? `Download ${filename}` : "Download original"}</a><button type="button" onClick={remove}>Delete logo</button></>}
    {message && <p role="status">{message}</p>}
  </section>;
}
