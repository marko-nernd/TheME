"use client";

import { ChangeEvent, useRef, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media-library";

function size(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
}

export default function AdminMediaLibrary({ initialItems }: { initialItems: AdminMediaItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<"all" | "image" | "video" | "unused">("all");
  const [view, setView] = useState<"tiles" | "list">("tiles");
  const [detail, setDetail] = useState<AdminMediaItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTargets, setDeleteTargets] = useState<AdminMediaItem[]>([]);
  const [cropTarget, setCropTarget] = useState<AdminMediaItem | null>(null);
  const [cropWidth, setCropWidth] = useState(1200);
  const [cropHeight, setCropHeight] = useState(800);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [cropZoom, setCropZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const visible = items.filter((item) => filter === "all" || item.kind === filter || (filter === "unused" && item.canDelete));

  function toggle(item: AdminMediaItem) {
    if (!item.canDelete) return;
    setSelected((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; });
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = "";
    if (!files.length) return;
    setSaving(true); setMessage(`Uploading ${files.length} file${files.length === 1 ? "" : "s"}…`);
    let uploaded = 0;
    for (const file of files) {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error ?? `${file.name} could not be uploaded.`); setSaving(false); return; }
      setItems((current) => [result.item as AdminMediaItem, ...current]); uploaded += 1;
    }
    setSaving(false); setMessage(`${uploaded} file${uploaded === 1 ? "" : "s"} uploaded.`);
  }

  async function removeTargets() {
    if (!deleteTargets.length) return;
    setSaving(true); setMessage("");
    const response = await fetch("/api/admin/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ paths: deleteTargets.map((item) => item.path) }) });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return setMessage(result.error ?? "The selected files could not be deleted.");
    const deleted = new Set<string>(result.deleted ?? []);
    setItems((current) => current.filter((item) => !deleted.has(item.path)));
    setSelected(new Set()); setDeleteTargets([]); setDetail(null);
    setMessage(`${deleted.size} unused file${deleted.size === 1 ? "" : "s"} permanently deleted.`);
  }

  function openCrop(item: AdminMediaItem) {
    setCropTarget(item); setCropWidth(item.width ?? 1200); setCropHeight(item.height ?? 800); setCropX(50); setCropY(50); setCropZoom(1); setDetail(null); setMessage("");
  }

  async function saveCrop() {
    if (!cropTarget) return;
    setSaving(true); setMessage("Creating cropped image…");
    try {
      const image = await loadImage(cropTarget.previewUrl);
      const width = Math.max(64, Math.min(3840, Math.round(cropWidth)));
      const height = Math.max(64, Math.min(3840, Math.round(cropHeight)));
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * cropZoom;
      const drawWidth = image.naturalWidth * scale; const drawHeight = image.naturalHeight * scale;
      const left = (width - drawWidth) * (cropX / 100); const top = (height - drawHeight) * (cropY / 100);
      canvas.getContext("2d")?.drawImage(image, left, top, drawWidth, drawHeight);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .9));
      if (!blob) throw new Error("Crop could not be generated.");
      const form = new FormData(); form.set("file", new File([blob], `crop-${width}x${height}.webp`, { type: "image/webp" }));
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Crop could not be saved.");
      setItems((current) => [result.item as AdminMediaItem, ...current]); setCropTarget(null); setDetail(result.item); setMessage(`New ${width}×${height} crop saved. The original was preserved.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Crop could not be saved."); }
    setSaving(false);
  }

  const selectedItems = items.filter((item) => selected.has(item.id));
  return <div className="admin-media-library">
    <div className="admin-heading"><div><p className="astryx-kicker">MEDIA FILE EXPLORER</p><h2>Images and video</h2></div><span className="admin-count">{items.length} files · {items.filter((item) => item.canDelete).length} unused</span></div>
    <p className="admin-hero-help">Upload media, inspect every usage, create purpose-sized crops, and safely remove files that are no longer referenced.</p>
    <div className="admin-media-toolbar">
      <div className="media-library-tabs" role="tablist">{(["all", "image", "video", "unused"] as const).map((value) => <button type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} key={value}>{value}</button>)}</div>
      <div className="admin-media-actions"><button type="button" className={view === "tiles" ? "is-active" : ""} onClick={() => setView("tiles")} aria-label="Tile view">▦ Tiles</button><button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="List view">☷ List</button><button type="button" className="is-upload" onClick={() => uploadRef.current?.click()} disabled={saving}>Upload media ↑</button><input ref={uploadRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,video/mp4" onChange={upload} hidden /></div>
    </div>
    {message && <p className="admin-media-message" role="status">{message}</p>}
    <div className={`media-library-grid is-${view}`}>
      {visible.map((item) => <article className={selected.has(item.id) ? "is-selected" : ""} key={item.id} onClick={() => setDetail(item)}>
        <label className="admin-media-select" title={item.canDelete ? "Select for batch deletion" : "This file is currently in use"} onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.has(item.id)} disabled={!item.canDelete} onChange={() => toggle(item)} /><span /></label>
        <div className="media-library-preview">{item.kind === "video" ? <video src={item.previewUrl} muted playsInline preload="metadata" /> : <img src={item.previewUrl} alt="" />}<span>{item.kind}</span></div>
        <div className="media-library-copy"><strong title={item.path}>{item.path}</strong><small>{item.location} · {size(item.sizeBytes)}{item.width && item.height ? ` · ${item.width}×${item.height}` : ""}</small><div>{item.usages.length ? item.usages.map((usage) => <span key={usage}>{usage}</span>) : <span className="is-unused">Unused</span>}</div><button type="button" onClick={(event) => { event.stopPropagation(); setDetail(item); }}>View details</button></div>
      </article>)}
    </div>
    {selectedItems.length > 0 && <div className="admin-media-batch-bar"><strong>{selectedItems.length} unused file{selectedItems.length === 1 ? "" : "s"} selected</strong><button type="button" onClick={() => setSelected(new Set())}>Clear</button><button type="button" onClick={() => setDeleteTargets(selectedItems)}>Delete selected</button></div>}

    {detail && <div className="admin-media-detail-backdrop" onMouseDown={() => setDetail(null)}><section className="admin-media-detail" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><span>MEDIA DETAILS</span><h2>{detail.kind === "video" ? "Video preview" : "Image preview"}</h2></div><button type="button" onClick={() => setDetail(null)}>×</button></header><div className="admin-media-detail-preview">{detail.kind === "video" ? <video src={detail.previewUrl} controls autoPlay muted playsInline /> : <img src={detail.previewUrl} alt="Selected media preview" />}</div><dl><div><dt>Path</dt><dd>{detail.path}</dd></div><div><dt>Storage</dt><dd>{detail.location}</dd></div><div><dt>File size</dt><dd>{size(detail.sizeBytes)}</dd></div>{detail.width && detail.height && <div><dt>Dimensions</dt><dd>{detail.width} × {detail.height}</dd></div>}</dl><div className="admin-media-usage"><span>USED ON</span>{detail.usages.length ? <ul>{detail.usages.map((usage) => <li key={usage}>{usage}</li>)}</ul> : <p>This file is unused and can be deleted.</p>}</div><footer>{detail.kind === "image" && <button type="button" onClick={() => openCrop(detail)}>Crop by width &amp; height</button>}{detail.canDelete && <button className="is-danger" type="button" onClick={() => { setDetail(null); setDeleteTargets([detail]); }}>Delete unused file</button>}</footer></section></div>}

    {cropTarget && <div className="admin-media-detail-backdrop"><section className="admin-media-crop" role="dialog" aria-modal="true"><header><div><span>IMAGE CROP TOOL</span><h2>Set the output size.</h2></div><button type="button" onClick={() => setCropTarget(null)}>×</button></header><div className="admin-media-crop-layout"><div className="admin-media-crop-stage" style={{ aspectRatio: `${cropWidth} / ${cropHeight}` }}><img src={cropTarget.previewUrl} alt="Crop preview" style={{ objectPosition: `${cropX}% ${cropY}%`, transform: `scale(${cropZoom})` }} /></div><div className="admin-media-crop-controls"><div><label>Width (px)<input type="number" min="64" max="3840" value={cropWidth} onChange={(event) => setCropWidth(Number(event.target.value))} /></label><label>Height (px)<input type="number" min="64" max="3840" value={cropHeight} onChange={(event) => setCropHeight(Number(event.target.value))} /></label></div><label>Horizontal position<input type="range" min="0" max="100" value={cropX} onChange={(event) => setCropX(Number(event.target.value))} /></label><label>Vertical position<input type="range" min="0" max="100" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} /></label><label>Zoom<input type="range" min="1" max="2" step=".01" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} /></label><p>The crop is saved as a new optimized image. The original file is not changed.</p></div></div><footer><button type="button" onClick={() => setCropTarget(null)}>Cancel</button><button className="button" type="button" disabled={saving} onClick={saveCrop}>{saving ? "Saving crop…" : `Save ${cropWidth}×${cropHeight} crop ↗`}</button></footer></section></div>}

    {deleteTargets.length > 0 && <div className="request-delete-backdrop" role="presentation" onMouseDown={() => !saving && setDeleteTargets([])}><section className="request-delete-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button type="button" aria-label="Close" onClick={() => setDeleteTargets([])}>×</button><span>DELETE UNUSED MEDIA</span><h2>Delete {deleteTargets.length} file{deleteTargets.length === 1 ? "" : "s"}?</h2><p>This permanently removes the selected physical files. The server will refuse the entire request if any file has become referenced by a page or record.</p>{message && <small role="alert">{message}</small>}<div><button type="button" onClick={() => setDeleteTargets([])}>Cancel</button><button type="button" disabled={saving} onClick={removeTargets}>{saving ? "Deleting…" : "Delete selected files"}</button></div></section></div>}
  </div>;
}
