"use client";

import Image from "next/image";
import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PortfolioItem = {
  id: string;
  imagePath: string;
  hasImageData: boolean;
  caption: string;
  credit: string | null;
  isPrivate: boolean;
};
type PendingImage = { name: string; url: string; image: HTMLImageElement };
type Offset = { x: number; y: number };

export default function PortfolioManager({ items, tier, limit }: {
  items: PortfolioItem[];
  tier: string;
  limit: number;
}) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; offset: Offset } | null>(null);
  const [queue, setQueue] = useState<PendingImage[]>([]);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [stageSize, setStageSize] = useState({ width: 480, height: 600 });
  const active = queue[0];
  const available = Math.max(0, limit - items.length);

  useEffect(() => {
    if (!active || !stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [active]);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files || [])].slice(0, available);
    event.target.value = "";
    const invalid = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024);
    if (invalid) return setMessage("Every image must be JPG, PNG, or WebP and no larger than 15 MB.");
    const loaded = await Promise.all(files.map((file) => new Promise<PendingImage>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new window.Image();
      image.onload = () => resolve({ name: file.name, url, image });
      image.onerror = reject;
      image.src = url;
    })));
    setQueue(loaded);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setMessage(`${loaded.length} image${loaded.length === 1 ? "" : "s"} selected. Crop each image before saving.`);
  }

  function geometry(nextZoom = zoom) {
    if (!active || !stageRef.current) return { width: 1, height: 1, left: 0, top: 0 };
    const boxWidth = stageSize.width;
    const boxHeight = stageSize.height;
    const base = Math.max(boxWidth / active.image.naturalWidth, boxHeight / active.image.naturalHeight);
    const width = active.image.naturalWidth * base * nextZoom;
    const height = active.image.naturalHeight * base * nextZoom;
    return { width, height, left: (boxWidth - width) / 2 + offset.x, top: (boxHeight - height) / 2 + offset.y };
  }

  function clamp(candidate: Offset, nextZoom = zoom) {
    if (!active || !stageRef.current) return candidate;
    const boxWidth = stageSize.width;
    const boxHeight = stageSize.height;
    const base = Math.max(boxWidth / active.image.naturalWidth, boxHeight / active.image.naturalHeight);
    const width = active.image.naturalWidth * base * nextZoom;
    const height = active.image.naturalHeight * base * nextZoom;
    return {
      x: Math.max(-(width - boxWidth) / 2, Math.min((width - boxWidth) / 2, candidate.x)),
      y: Math.max(-(height - boxHeight) / 2, Math.min((height - boxHeight) / 2, candidate.y)),
    };
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, offset };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    setOffset(clamp({
      x: dragRef.current.offset.x + event.clientX - dragRef.current.x,
      y: dragRef.current.offset.y + event.clientY - dragRef.current.y,
    }));
  }

  async function saveCurrent() {
    if (!active || !stageRef.current) return;
    setSaving(true);
    const boxWidth = stageRef.current.clientWidth;
    const boxHeight = stageRef.current.clientHeight;
    const drawn = geometry();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(active.image, drawn.left * 1080 / boxWidth, drawn.top * 1350 / boxHeight, drawn.width * 1080 / boxWidth, drawn.height * 1350 / boxHeight);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .86));
    if (!blob) return setSaving(false);
    const form = new FormData();
    form.set("image", new File([blob], active.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
    form.set("caption", caption);
    form.set("credit", credit);
    form.set("isPrivate", String(isPrivate));
    const response = await fetch("/api/account/portfolio", { method: "POST", body: form });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.error || "Upload failed.");
    URL.revokeObjectURL(active.url);
    const remaining = queue.slice(1);
    setQueue(remaining);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCaption("");
    setCredit("");
    setIsPrivate(false);
    setMessage(remaining.length ? `Saved. ${remaining.length} image${remaining.length === 1 ? "" : "s"} still need cropping.` : "Batch upload complete.");
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this portfolio image?")) return;
    const response = await fetch(`/api/account/portfolio?id=${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  const drawn = geometry();
  return (
    <section className="portfolio-manager">
      <header><div><p className="eyebrow light"><span />Selected work</p><h2>Portfolio images</h2></div><strong>{items.length} / {limit}</strong></header>
      {limit > 0 ? <div className="portfolio-batch-picker">
        <label className="button">Select images<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={!available || saving} /></label>
        <small>Select up to {available} images. Each source may be up to 15 MB and is cropped to 4:5, resized to 1080px wide, and compressed as WebP.</small>
      </div> : <p className="dashboard-empty">Upgrade to Creator membership to upload selected work.</p>}
      {active && <div className="portfolio-crop-editor">
        <header><strong>Crop {active.name}</strong><span>{queue.length} image{queue.length === 1 ? "" : "s"} in batch</span></header>
        <div className="portfolio-crop-stage" ref={stageRef} onPointerDown={startDrag} onPointerMove={drag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={active.url} alt="Portfolio crop preview" draggable={false} style={{ width: drawn.width, height: drawn.height, left: drawn.left, top: drawn.top }} />
        </div>
        <label>Zoom<input type="range" min="1" max="3" step=".01" value={zoom} onChange={(event) => { const next = Number(event.target.value); setZoom(next); setOffset((current) => clamp(current, next)); }} /></label>
        <div className="portfolio-crop-fields"><label>Caption<input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={180} /></label><label>Credit<input value={credit} onChange={(event) => setCredit(event.target.value)} maxLength={120} /></label><label className="dashboard-check"><input checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} type="checkbox" /> Blur this image publicly</label></div>
        <button className="button portfolio-save-primary" type="button" disabled={saving} onClick={saveCurrent}>{saving ? "Optimizing…" : queue.length > 1 ? "Save image & crop next ↗" : "Save image ↗"}</button>
      </div>}
      {message && <p role="status">{message}</p>}
      <div className="portfolio-manager-grid">{items.map((item) => <figure className={item.isPrivate ? "is-private" : ""} key={item.id}><Image unoptimized fill src={item.hasImageData ? `/api/portfolio/${item.id}` : item.imagePath} alt={item.caption || "Portfolio image"} />{item.isPrivate && <span>Private · blurred publicly</span>}<button type="button" onClick={() => remove(item.id)}>Remove</button></figure>)}</div>
      <small>{tier.replaceAll("_", " ")} membership · privacy is controlled separately for every image.</small>
    </section>
  );
}
