"use client";

import { useState } from "react";

export default function AdminDatabaseBackup() {
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  async function download() {
    setCreating(true);
    setMessage("Creating a consistent PostgreSQL backup…");
    const response = await fetch("/api/admin/backups/sql");
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage(result.error || "Backup failed.");
      setCreating(false);
      return;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "model-escape-backup.sql";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${filename}. Store it outside this server.`);
    setCreating(false);
  }

  return (
    <section className="admin-backup-panel">
      <p className="astryx-kicker">POSTGRESQL BACKUP</p>
      <h3>Save the current SQL snapshot.</h3>
      <p>The download includes schema and data from the current database volume. Member records, events, transactions, messages, reviews, and admin settings are included; binary profile and identity data stored in PostgreSQL is included as encoded SQL.</p>
      <button className="button" type="button" disabled={creating} onClick={download}>{creating ? "Creating backup…" : "Download SQL backup ↗"}</button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
