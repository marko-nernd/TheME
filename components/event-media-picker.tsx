"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";

export type PreparedEventMedia = {
  media: File;
  poster?: File;
  kind: "image" | "video";
  previewUrl: string;
  posterUrl?: string;
};

const MAX_BYTES = 5 * 1024 * 1024;

function canvasFile(canvas: HTMLCanvasElement, type: string, name: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not prepare the event image."));
      resolve(new File([blob], name, { type }));
    }, type, 0.9);
  });
}

export default function EventMediaPicker({
  onPrepared,
  currentMedia,
  currentPoster,
  currentType = "image",
  maxBytes = MAX_BYTES,
  helpText,
}: {
  onPrepared: (media: PreparedEventMedia | null) => void;
  currentMedia?: string | null;
  currentPoster?: string | null;
  currentType?: "image" | "video";
  maxBytes?: number;
  helpText?: string;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(currentMedia ?? "");
  const [poster, setPoster] = useState(currentPoster ?? "");
  const [kind, setKind] = useState<"image" | "video">(currentType);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [cropping, setCropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "video/mp4"].includes(file.type)) {
      return setError("Choose a JPG, PNG, or MP4 file.");
    }
    if (file.size > maxBytes) return setError(`Hero media must be under ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    const url = URL.createObjectURL(file);
    setSourceFile(file);
    setSourceUrl(url);
    if (file.type === "video/mp4") {
      setBusy(true);
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.src = url;
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("The MP4 could not be read."));
        });
        const ratio = video.videoWidth / video.videoHeight;
        if (Math.abs(ratio - 16 / 9) > 0.035) {
          throw new Error("MP4 hero videos must already be 16:9 (1920×1080 recommended).");
        }
        video.currentTime = Math.min(Math.max(video.duration * 0.08, 0.1), 1);
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        canvas.getContext("2d")?.drawImage(video, 0, 0, 1920, 1080);
        const posterFile = await canvasFile(canvas, "image/jpeg", "event-video-poster.jpg");
        const posterUrl = URL.createObjectURL(posterFile);
        setKind("video");
        setPreview(url);
        setPoster(posterUrl);
        onPrepared({ media: file, poster: posterFile, kind: "video", previewUrl: url, posterUrl });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not prepare the video.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setZoom(1);
    setX(50);
    setY(50);
    setCropping(true);
  }

  async function applyCrop() {
    if (!sourceFile || !imageRef.current) return;
    setBusy(true);
    setError("");
    try {
      const image = imageRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const baseScale = Math.max(1920 / image.naturalWidth, 1080 / image.naturalHeight);
      const scale = baseScale * zoom;
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const overflowX = Math.max(0, drawWidth - 1920);
      const overflowY = Math.max(0, drawHeight - 1080);
      canvas.getContext("2d")?.drawImage(
        image,
        -(overflowX * x) / 100,
        -(overflowY * y) / 100,
        drawWidth,
        drawHeight,
      );
      const outputType = sourceFile.type === "image/png" ? "image/png" : "image/jpeg";
      const cropped = await canvasFile(canvas, outputType, `event-hero.${outputType === "image/png" ? "png" : "jpg"}`);
      if (cropped.size > maxBytes) throw new Error(`The prepared image exceeds ${Math.round(maxBytes / 1024 / 1024)} MB. Try a JPG source.`);
      const croppedUrl = URL.createObjectURL(cropped);
      setKind("image");
      setPreview(croppedUrl);
      setPoster("");
      setCropping(false);
      onPrepared({ media: cropped, kind: "image", previewUrl: croppedUrl });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not crop the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="event-media-picker">
      <div className="event-media-preview">
        {preview ? kind === "video" ? (
          <video src={preview} poster={poster || undefined} muted loop autoPlay playsInline preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Event hero preview" />
        ) : <span>1920 × 1080 event hero</span>}
      </div>
      <div className="event-media-controls">
        <label className="button">
          {busy ? "Preparing…" : "Choose hero media"}
          <input type="file" accept="image/jpeg,image/png,video/mp4" onChange={choose} disabled={busy} hidden />
        </label>
        <p>{helpText ?? `JPG, PNG, or a looping 16:9 MP4. Maximum ${Math.round(maxBytes / 1024 / 1024)} MB. Images are exported at 1920×1080; video posters are generated automatically.`}</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {cropping && sourceUrl && (
        <div className="event-crop-backdrop" role="presentation">
          <section className="event-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="event-crop-title">
            <header><div><span>EVENT HERO</span><h3 id="event-crop-title">Crop to 16:9</h3></div><button type="button" onClick={() => setCropping(false)} aria-label="Close">×</button></header>
            <div className="event-crop-stage" style={{ "--crop-x": `${x}%`, "--crop-y": `${y}%`, "--crop-zoom": zoom } as CSSProperties}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imageRef} src={sourceUrl} alt="Crop source" />
            </div>
            <div className="event-crop-ranges">
              <label>Zoom<input type="range" min="1" max="2.5" step=".01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
              <label>Horizontal position<input type="range" min="0" max="100" value={x} onChange={(event) => setX(Number(event.target.value))} /></label>
              <label>Vertical position<input type="range" min="0" max="100" value={y} onChange={(event) => setY(Number(event.target.value))} /></label>
            </div>
            <div className="event-crop-actions"><button type="button" onClick={() => setCropping(false)}>Cancel</button><button className="button" type="button" onClick={applyCrop} disabled={busy}>{busy ? "Exporting…" : "Use 1920×1080 image"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export function EventMediaManager({
  eventId,
  currentMedia,
  currentPoster,
  currentType,
}: {
  eventId: string;
  currentMedia?: string;
  currentPoster?: string;
  currentType?: "image" | "video";
}) {
  const [prepared, setPrepared] = useState<PreparedEventMedia | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function upload() {
    if (!prepared) return;
    setSaving(true);
    setStatus("");
    const body = new FormData();
    body.set("media", prepared.media);
    if (prepared.poster) body.set("poster", prepared.poster);
    const response = await fetch(`/api/events/${eventId}/media`, { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    setStatus(response.ok ? "Hero media updated." : data.error ?? "Upload failed.");
  }

  return (
    <div className="event-media-manager">
      <EventMediaPicker onPrepared={setPrepared} currentMedia={currentMedia} currentPoster={currentPoster} currentType={currentType} />
      <button className="button" type="button" disabled={!prepared || saving} onClick={upload}>{saving ? "Uploading…" : "Save hero media"}</button>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
