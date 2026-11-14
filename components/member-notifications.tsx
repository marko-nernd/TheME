"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function MemberNotifications({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Array<{ id: string; title: string; message: string; href: string | null }>>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function refresh() { try { const response = await fetch("/api/account/notifications", { cache: "no-store" }); if (!response.ok) return; const result = await response.json(); if (active) { setItems(result.items); setCount(result.unreadCount); } } catch { /* Retry on the next refresh. */ } }
    refresh(); const timer = window.setInterval(refresh, 60000);
    window.addEventListener("member-notifications-changed", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("member-notifications-changed", refresh); };
  }, []);
  async function markRead(id?: string) {
    setError("");
    try {
      const response = await fetch("/api/account/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(id ? { ids: [id] } : { all: true }) });
      if (!response.ok) throw new Error();
      setItems((current) => id ? current.filter((item) => item.id !== id) : []); setCount((current) => id ? Math.max(0, current - 1) : 0);
      window.dispatchEvent(new Event("member-notifications-changed"));
    } catch { setError("Updates could not be marked read. Please try again."); }
  }
  return <details className={compact ? "member-notifications is-compact" : "member-notifications"}><summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg> Notifications {count > 0 && <b>{count}</b>}<span aria-hidden="true">⌄</span></summary><div className="member-notification-items">{count > 0 && <button type="button" className="notification-mark-all" onClick={() => markRead()}>Mark all as read</button>}{items.map((item) => <article key={item.id}><Link href={item.href ?? "/dashboard#activity"} onClick={() => void markRead(item.id)}><strong>{item.title}</strong><small>{item.message}</small></Link><button type="button" aria-label={`Dismiss ${item.title}`} onClick={() => markRead(item.id)}>×</button></article>)}{count === 0 && <p>You’re all caught up.</p>}{error && <p role="alert">{error}</p>}</div></details>;
}
