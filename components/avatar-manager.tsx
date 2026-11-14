"use client";

import Image from "next/image";
import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { memberPlaceholder } from "@/lib/member-placeholder";

type ImageSize = { width: number; height: number };
type Offset = { x: number; y: number };

export default function AvatarManager({
  memberId,
  name,
  role,
  version,
  endpoint = "/api/account/avatar",
}: {
  memberId: string;
  name: string;
  role: string;
  version: number | null;
  endpoint?: string;
}) {
  const router = useRouter();
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; offset: Offset } | null>(null);
  const [preview, setPreview] = useState(version ? `/api/members/${memberId}/avatar?v=${version}` : "");
  const [cropUrl, setCropUrl] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>({ width: 1, height: 1 });
  const [boxSize, setBoxSize] = useState(360);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [mode, setMode] = useState("upload");
  const [provider, setProvider] = useState("instagram");
  const [instagramConfigured, setInstagramConfigured] = useState(false);
  const [hasSocial, setHasSocial] = useState(false);
  const [handle, setHandle] = useState("");
  useEffect(() => { let active = true; fetch(endpoint).then((r) => r.json()).then((data) => { if (active && data.source) { const status = new URLSearchParams(window.location.search).get("instagramPhoto"); if (status) setMessage(status === "connected" ? "Instagram profile photo connected." : "Instagram connection did not complete. Try again or upload a photo."); setInstagramConfigured(Boolean(data.instagramConfigured)); setHasSocial(Boolean(data.hasSocial)); setMode(data.source); setProvider(data.provider || "instagram"); setHandle(data.handle || ""); if (data.version) setPreview(`/api/members/${memberId}/avatar?v=${data.version}`); } }).catch(() => {}); return () => { active = false; }; }, [endpoint, memberId]);
  async function useSource(source: string, saved = false) {
    setSaving(true); setMessage("");
    try { const response = await fetch(endpoint, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ source, provider, handle, saved }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setPreview(`/api/members/${memberId}/avatar?v=${result.version}`); if (source === "social") setHasSocial(true); setMessage("Profile photo updated."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update photo."); } finally { setSaving(false); }
  }

  useEffect(() => {
    if (!cropUrl || !cropBoxRef.current) return;
    const observer = new ResizeObserver(([entry]) => setBoxSize(entry.contentRect.width));
    observer.observe(cropBoxRef.current);
    return () => observer.disconnect();
  }, [cropUrl]);

  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape" && cropUrl) cancelCrop();
    }
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  });

  function clamp(candidate: Offset, nextZoom = zoom) {
    const base = Math.max(boxSize / imageSize.width, boxSize / imageSize.height);
    const renderedWidth = imageSize.width * base * nextZoom;
    const renderedHeight = imageSize.height * base * nextZoom;
    return {
      x: Math.max(-(renderedWidth - boxSize) / 2, Math.min((renderedWidth - boxSize) / 2, candidate.x)),
      y: Math.max(-(renderedHeight - boxSize) / 2, Math.min((renderedHeight - boxSize) / 2, candidate.y)),
    };
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP image smaller than 8 MB.");
      return;
    }
    setMessage("");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCropUrl(URL.createObjectURL(file));
  }

  function cancelCrop() {
    if (cropUrl) URL.revokeObjectURL(cropUrl);
    setCropUrl("");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
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

  async function saveCrop() {
    const source = cropBoxRef.current?.querySelector("img");
    if (!source || !cropBoxRef.current) return;
    setSaving(true);
    setMessage("");
    const base = Math.max(boxSize / imageSize.width, boxSize / imageSize.height);
    const renderedWidth = imageSize.width * base * zoom;
    const renderedHeight = imageSize.height * base * zoom;
    const left = (boxSize - renderedWidth) / 2 + offset.x;
    const top = (boxSize - renderedHeight) / 2 + offset.y;
    const factor = 500 / boxSize;
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(source, left * factor, top * factor, renderedWidth * factor, renderedHeight * factor);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) {
      setMessage("Could not create the cropped image.");
      setSaving(false);
      return;
    }
    const form = new FormData();
    form.set("avatar", new File([blob], "profile.webp", { type: "image/webp" }));
    const response = await fetch(endpoint, { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not update your photo.");
      setSaving(false);
      return;
    }
    cancelCrop();
    setMode("upload");
    setPreview(`/api/members/${memberId}/avatar?v=${result.version}`);
    setMessage("Profile photo updated.");
    setSaving(false);
    router.refresh();
  }

  async function remove() {
    setSaving(true);
    setMessage("");
    const response = await fetch(endpoint, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json();
      setMessage(result.error ?? "Could not remove your photo.");
      setSaving(false);
      return;
    }
    setPreview("");
    setMessage("Profile photo removed.");
    setSaving(false);
    router.refresh();
  }

  const base = Math.max(boxSize / imageSize.width, boxSize / imageSize.height);
  const displayWidth = imageSize.width * base * zoom;
  const displayHeight = imageSize.height * base * zoom;

  return (
    <>
      <div className="avatar-manager">
        <div className="avatar-thumbnail">
          <Image
            unoptimized
            src={preview || memberPlaceholder(role)}
            alt={preview ? `${name} profile thumbnail` : `${role} placeholder`}
            width={112}
            height={112}
          />
        </div>
        <div>
          <strong>Profile photo</strong>
          <p>Shown as a small identity thumbnail. You can center, zoom, and crop every upload before it is stored at 500×500 pixels.</p>
          <fieldset className="avatar-source-options"><legend>Profile photo source</legend>
            <label><input type="radio" name={`photo-source-${memberId}`} checked={mode === "upload"} onChange={() => setMode("upload")} /> Custom uploaded photo</label>
            <label><input type="radio" name={`photo-source-${memberId}`} checked={mode === "social"} onChange={() => setMode("social")} /> Social profile photo</label>
          </fieldset>
          {mode === "social" && <div className="social-avatar-fields"><label>Social platform<select value={provider} onChange={(event) => setProvider(event.target.value)} disabled={saving}><option value="instagram">Instagram</option><option value="bluesky">Bluesky</option><option value="github">GitHub</option></select></label>{provider !== "instagram" && <label>{provider === "bluesky" ? "Full handle (e.g. name.bsky.social)" : "GitHub username"}<input value={handle} onChange={(event) => setHandle(event.target.value)} autoCapitalize="none" spellCheck={false} disabled={saving} /></label>}<p>Uses a copy of the public profile photo. Your uploaded photo stays saved.</p>{provider === "instagram" ? <div>{endpoint.startsWith("/api/admin") ? <p>The account owner must connect Instagram from their own Profile photo settings.</p> : instagramConfigured ? <a className="button" href="/api/account/social/instagram/connect">Connect Instagram &amp; use photo</a> : <p>Instagram connection is awaiting site setup. Upload a custom photo for now.</p>}<small>Instagram import supports eligible Business or Creator accounts.</small></div> : <button className="button" type="button" disabled={saving || !handle.trim()} onClick={() => useSource("social")}>{saving ? "Importing…" : "Use social profile photo"}</button>}{hasSocial && <button type="button" disabled={saving} onClick={() => useSource("social", true)}>Use saved social photo</button>}</div>}
          <div className="avatar-actions" hidden={mode !== "upload"}>
            <button type="button" disabled={saving} onClick={() => useSource("upload")}>Use saved upload</button>
            <label className="button">
              {preview ? "Replace photo" : "Add photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} disabled={saving} />
            </label>
            {preview && <button type="button" onClick={remove} disabled={saving}>Remove</button>}
          </div>
          {message && <small role="status">{message}</small>}
        </div>
      </div>

      {cropUrl && (
        <div className="crop-dialog-backdrop" role="presentation" onPointerDown={(event) => {
          if (event.target === event.currentTarget) cancelCrop();
        }}>
          <section className="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-title">
            <div className="crop-dialog-heading">
              <div><span>PROFILE PHOTO</span><h2 id="crop-title">Center and crop.</h2></div>
              <button type="button" onClick={cancelCrop} aria-label="Close crop preview">×</button>
            </div>
            <div
              className="crop-stage"
              ref={cropBoxRef}
              onPointerDown={startDrag}
              onPointerMove={drag}
              onPointerUp={() => { dragRef.current = null; }}
              onPointerCancel={() => { dragRef.current = null; }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cropUrl}
                alt="Crop preview"
                draggable={false}
                onLoad={(event) => setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  left: (boxSize - displayWidth) / 2 + offset.x,
                  top: (boxSize - displayHeight) / 2 + offset.y,
                }}
              />
              <div className="crop-guide" aria-hidden="true" />
            </div>
            <label className="crop-zoom">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step=".01"
                value={zoom}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setZoom(next);
                  setOffset((current) => clamp(current, next));
                }}
              />
            </label>
            <p>Drag the image to reposition it. The square preview is exactly what will appear as your thumbnail.</p>
            <div className="crop-dialog-actions">
              <button type="button" onClick={cancelCrop}>Cancel</button>
              <button className="button" type="button" onClick={saveCrop} disabled={saving}>{saving ? "Saving…" : "Use this crop ↗"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
