"use client";

import { ChangeEvent, useRef, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media-library";

type Props = {
  label: string;
  value: string;
  items: AdminMediaItem[];
  onChange: (value: string) => void;
  onItemsChange: (items: AdminMediaItem[]) => void;
  hint?: string;
};

export default function AdminMediaPicker({ label, value, items, onChange, onItemsChange, hint }: Props) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const images = items.filter((item) => item.kind === "image");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setUploading(true); setMessage("Uploading and optimizing image…");
    const form = new FormData(); form.set("file", file);
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    setUploading(false);
    if (!response.ok) return setMessage(result.error ?? "Image could not be uploaded.");
    const next = [result.item as AdminMediaItem, ...items];
    onItemsChange(next); onChange(result.item.path); setMessage("Image uploaded and selected.");
  }

  async function remove(item: AdminMediaItem) {
    if (!window.confirm(`Permanently delete ${item.path}? Only unused media can be deleted.`)) return;
    const response = await fetch("/api/admin/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: item.path }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error ?? "Image could not be deleted.");
    onItemsChange(items.filter((candidate) => candidate.id !== item.id));
    if (value === item.path) onChange("");
    setMessage("Unused image deleted.");
  }

  return <div className="admin-media-field">
    <span>{label}</span>
    <div className="admin-media-field-control">
      <button type="button" className="admin-media-current" onClick={() => { setOpen(true); setMessage(""); }}>
        {value ? <img src={value} alt="" /> : <i>No image selected</i>}
        <b>{value ? "Change image" : "Choose image"}</b>
      </button>
      {value && <button type="button" className="admin-media-clear" onClick={() => onChange("")}>Remove selection</button>}
    </div>
    {hint && <small>{hint}</small>}
    {open && <div className="admin-media-picker-backdrop" role="presentation" onMouseDown={() => !uploading && setOpen(false)}>
      <section className="admin-media-picker" role="dialog" aria-modal="true" aria-label={`Choose ${label}`} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>MEDIA LIBRARY</span><h2>Choose {label.toLowerCase()}</h2></div><button type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button></header>
        <div className="admin-media-picker-actions">
          <button type="button" onClick={() => uploadRef.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : "Upload new image ↑"}</button>
          <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" onChange={upload} hidden />
          <span>JPEG, PNG, WebP, AVIF or SVG · up to 15 MB</span>
        </div>
        {message && <p role="status">{message}</p>}
        <div className="admin-media-picker-grid">
          {images.map((item) => <article className={item.path === value ? "is-selected" : ""} key={item.id}>
            <button type="button" className="admin-media-picker-select" onClick={() => { onChange(item.path); setOpen(false); }}>
              <img src={item.previewUrl} alt="" /><span>{item.path === value ? "Selected ✓" : "Select"}</span>
            </button>
            <small title={item.path}>{item.path}</small>
            {item.canDelete && <button type="button" className="admin-media-picker-delete" onClick={() => void remove(item)}>Delete</button>}
          </article>)}
          {!images.length && <div className="admin-media-picker-empty">No images yet. Upload the first image above.</div>}
        </div>
      </section>
    </div>}
  </div>;
}
