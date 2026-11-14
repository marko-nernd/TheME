"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RestoreSentRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function restore() {
    setSaving(true);
    const response = await fetch(`/api/collaborations/${requestId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return <button className="restore-sent-request" type="button" disabled={saving} onClick={restore}>{saving ? "Restoring…" : "Restore"}</button>;
}
