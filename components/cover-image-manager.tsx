"use client";

import Image from "next/image";
import { ChangeEvent, PointerEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CoverImageManager({ currentUrl }: { currentUrl: string }) {
  const router = useRouter();
  const [cropUrl, setCropUrl] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP image no larger than 15 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const next = new window.Image();
    next.onload = () => { setImage(next); setCropUrl(url); setZoom(1); setX(50); setY(50); };
    next.src = url;
  }

  function close() {
    if (cropUrl) URL.revokeObjectURL(cropUrl);
    setCropUrl("");
    setImage(null);
  }

  async function save() {
    if (!image) return;
    setSaving(true);
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) return;
    const base = Math.max(1920 / image.naturalWidth, 1080 / image.naturalHeight) * zoom;
    const width = image.naturalWidth * base;
    const height = image.naturalHeight * base;
    const left = (1920 - width) * (x / 100);
    const top = (1080 - height) * (y / 100);
    context.drawImage(image, left, top, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .88));
    if (!blob) return;
    const form = new FormData();
    form.set("cover", new File([blob], "cover.webp", { type: "image/webp" }));
    const response = await fetch("/api/account/cover", { method: "POST", body: form });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.error || "Cover upload failed.");
    close();
    setMessage("Portfolio cover updated at 1920×1080.");
    router.refresh();
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, startX: x, startY: y };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setX(Math.max(0, Math.min(100, dragRef.current.startX + (event.clientX - dragRef.current.x) / bounds.width * 100)));
    setY(Math.max(0, Math.min(100, dragRef.current.startY + (event.clientY - dragRef.current.y) / bounds.height * 100)));
  }

  return (
    <section className="cover-image-manager">
      <div className="cover-image-preview"><Image unoptimized fill src={currentUrl} alt="Current portfolio cover" /></div>
      <div><strong>Portfolio cover image</strong><p>Upload up to 15 MB, reposition it in a 16:9 crop preview, and store an optimized 1920×1080 WebP cover.</p><label className="button">Choose cover<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} /></label>{message && <small role="status">{message}</small>}</div>
      {cropUrl && <div className="cover-crop-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
        <section role="dialog" aria-modal="true" aria-labelledby="cover-crop-title">
          <header><div><span>PORTFOLIO COVER</span><h2 id="cover-crop-title">Crop to 1920×1080.</h2></div><button onClick={close} type="button">×</button></header>
          <div className="cover-crop-stage" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} style={{ backgroundImage: `url(${cropUrl})`, backgroundSize: `${zoom * 100}% auto`, backgroundPosition: `${x}% ${y}%` }} />
          <label>Zoom<input type="range" min="1" max="3" step=".01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
          <p>Drag the image directly to reposition it inside the crop.</p>
          <footer><button type="button" onClick={close}>Cancel</button><button className="button portfolio-save-primary" type="button" disabled={saving} onClick={save}>{saving ? "Optimizing…" : "Save cover"}</button></footer>
        </section>
      </div>}
    </section>
  );
}
