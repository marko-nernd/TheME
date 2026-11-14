"use client";
import { useState } from "react";

export default function AdminSponsorTierControl({ sponsorId, currentLevel }: { sponsorId: string; currentLevel: string }) {
  const [level, setLevel] = useState(currentLevel); const [message, setMessage] = useState("");
  async function propose() {
    const response = await fetch(`/api/admin/sponsors/${sponsorId}/tier-change`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ level }) });
    const result = await response.json(); setMessage(response.ok ? "Change sent for sponsor approval." : result.error);
  }
  return <div className="admin-sponsor-tier-control"><select value={level} onChange={(event) => setLevel(event.target.value)}>{["Silver","Gold","Platinum","Diamond"].map((item) => <option key={item}>{item}</option>)}</select><button type="button" onClick={propose}>Request change</button>{message && <small>{message}</small>}</div>;
}
