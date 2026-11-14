"use client";
import { useEffect, useRef, useState } from "react";

export function useFormDraft<T>({ storageKey, value, restore, enabled = true }: { storageKey: string; value: T; restore: (value: T) => void; enabled?: boolean }) {
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const current = useRef(value);
  const restoreRef = useRef(restore);
  const stopped = useRef(false);
  const serialized = JSON.stringify(value);
  useEffect(() => { current.current = value; restoreRef.current = restore; });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
        if (saved?.version === 1 && saved.at > Date.now() - 30 * 86400000) { restoreRef.current(saved.value); setRestored(true); }
      } catch { /* A damaged or unavailable browser draft must not block the form. */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => {
    if (!ready || !enabled) return;
    function save() {
      if (stopped.current) return;
      try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, at: Date.now(), value: current.current })); setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })); } catch { /* Private browsing can disable local storage. */ }
    }
    const timer = window.setTimeout(save, 650);
    window.addEventListener("pagehide", save);
    return () => { window.clearTimeout(timer); window.removeEventListener("pagehide", save); };
  }, [serialized, ready, enabled, storageKey]);
  function clearDraft() { stopped.current = true; try { localStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ } }
  return { ready, restored, savedAt, clearDraft };
}
