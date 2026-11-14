"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string; error: boolean };

export default function AdminToastHost() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let timer = 0;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const request = args[0];
      const url = typeof request === "string" ? request : request instanceof URL ? request.pathname : request.url;
      const method = String(args[1]?.method ?? (request instanceof Request ? request.method : "GET")).toUpperCase();
      if (url.includes("/api/admin/") && !["GET", "HEAD"].includes(method) && !url.includes("/system-status")) {
        let errorMessage = "";
        if (!response.ok) {
          try { errorMessage = (await response.clone().json()).error ?? "The change could not be saved."; } catch { errorMessage = "The change could not be saved."; }
        }
        window.clearTimeout(timer);
        setToast({ id: Date.now(), message: response.ok ? (method === "DELETE" ? "Deleted successfully." : "Changes saved successfully.") : errorMessage, error: !response.ok });
        timer = window.setTimeout(() => setToast(null), 2800);
      }
      return response;
    };
    return () => { window.fetch = originalFetch; window.clearTimeout(timer); };
  }, []);

  return toast ? <div key={toast.id} className={`admin-global-toast ${toast.error ? "is-error" : "is-success"}`} role={toast.error ? "alert" : "status"}><span>{toast.error ? "!" : "✓"}</span>{toast.message}</div> : null;
}
