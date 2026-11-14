"use client";

import { useState } from "react";

export default function BillingPortalButton({
  label = "Manage subscription ↗",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to open billing management.");
      }
      window.location.assign(data.url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to open billing management.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="portal-action">
      <button
        className="button"
        type="button"
        disabled={loading}
        onClick={openPortal}
      >
        {loading ? "Opening billing…" : label}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
