"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import EventMediaPicker, { type PreparedEventMedia } from "@/components/event-media-picker";

export type AdminHeroSlide = {
  id: string;
  mediaType: string;
  mediaPath: string | null;
  hasUpload: boolean;
  hasPoster?: boolean;
  mediaMime: string | null;
  eyebrow: string;
  title: string;
  accentText: string;
  copy: string;
  ctaLabel: string;
  ctaHref: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};

function mediaUrl(slide: AdminHeroSlide) {
  return slide.hasUpload ? `/api/hero-slides/${slide.id}/media` : slide.mediaPath;
}

function SlideModal({
  slide,
  order,
  onClose,
}: {
  slide: AdminHeroSlide | null;
  order: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [media, setMedia] = useState<PreparedEventMedia | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = new FormData(event.currentTarget);
    body.set("sortOrder", String(slide?.sortOrder ?? order));
    if (media) body.set("media", media.media);
    if (media?.poster) body.set("poster", media.poster);
    const response = await fetch(slide ? `/api/admin/hero-slides/${slide.id}` : "/api/admin/hero-slides", {
      method: slide ? "PATCH" : "POST",
      body,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not save the slide.");
      setSaving(false);
      return;
    }
    router.refresh();
    onClose();
  }

  const current = slide ? mediaUrl(slide) : null;
  return (
    <div className="admin-editor-backdrop hero-editor-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="admin-editor hero-slide-modal" role="dialog" aria-modal="true" aria-labelledby="hero-slide-title">
        <header>
          <div><p className="astryx-kicker">HOMEPAGE MEDIA</p><h2 id="hero-slide-title">{slide ? "Edit hero slide" : "Add hero slide"}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close editor">×</button>
        </header>
        <form className="admin-editor-form" onSubmit={save}>
          <label>Eyebrow<input name="eyebrow" defaultValue={slide?.eyebrow ?? ""} /></label>
          <label>Title<input name="title" defaultValue={slide?.title ?? ""} /></label>
          <label>Accent line<input name="accentText" defaultValue={slide?.accentText ?? ""} /></label>
          <label>Button label<input name="ctaLabel" defaultValue={slide?.ctaLabel ?? ""} /></label>
          <label>Button link<input name="ctaHref" defaultValue={slide?.ctaHref ?? ""} pattern="(/.*)?" placeholder="Optional, for example /events" /></label>
          <label className="admin-checkbox"><input name="isActive" type="checkbox" value="true" defaultChecked={slide?.isActive ?? true} /> Show on homepage</label>
          <label className="full">Supporting copy<textarea name="copy" rows={4} maxLength={700} defaultValue={slide?.copy ?? ""} /></label>
          <label className="full">Accessibility description<input name="altText" maxLength={240} defaultValue={slide?.altText ?? ""} /></label>
          {!slide && <label className="full">Existing site image path <small>Optional when uploading media</small><input name="mediaPath" placeholder="/images/desert-model.jpg" /></label>}
          <div className="full">
            <EventMediaPicker
              onPrepared={setMedia}
              currentMedia={current}
              currentPoster={slide?.hasPoster ? `${current}?poster=1` : current}
              currentType={slide?.mediaType === "video" ? "video" : "image"}
              maxBytes={10 * 1024 * 1024}
              helpText="Images are cropped and exported at 1920×1080. Looping MP4 files must be 16:9 and no larger than 10 MB."
            />
          </div>
          {error && <p className="form-error full" role="alert">{error}</p>}
          <div className="admin-editor-actions full">
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save slide"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AdminHeroManager({ slides }: { slides: AdminHeroSlide[] }) {
  const router = useRouter();
  const [ordered, setOrdered] = useState(slides);
  const [draggedId, setDraggedId] = useState("");
  const [editor, setEditor] = useState<AdminHeroSlide | null | "new">(null);
  const [savingOrder, setSavingOrder] = useState(false);

  async function reorder(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const next = [...ordered];
    const from = next.findIndex((slide) => slide.id === draggedId);
    const to = next.findIndex((slide) => slide.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrdered(next);
    setDraggedId("");
    setSavingOrder(true);
    const response = await fetch("/api/admin/hero-slides/reorder", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: next.map((slide) => slide.id) }),
    });
    setSavingOrder(false);
    if (response.ok) router.refresh();
  }

  async function remove(slide: AdminHeroSlide) {
    if (!window.confirm(`Delete ${slide.title ? `the homepage slide “${slide.title}”` : "this untitled homepage slide"}?`)) return;
    const response = await fetch(`/api/admin/hero-slides/${slide.id}`, { method: "DELETE" });
    if (response.ok) {
      setOrdered((current) => current.filter((item) => item.id !== slide.id));
      router.refresh();
    }
  }

  return (
    <div className="admin-hero-manager">
      <div className="admin-heading">
        <div><p className="astryx-kicker">HOMEPAGE MEDIA</p><h2>Hero slideshow</h2></div>
        <div className="admin-heading-actions">
          <span className="admin-count">{savingOrder ? "Saving order…" : `${ordered.filter((slide) => slide.isActive).length} active slides`}</span>
          <button className="button" type="button" onClick={() => setEditor("new")}>Add slide +</button>
        </div>
      </div>
      <p className="admin-hero-help">Drag rows to change the homepage order. Images are 1920×1080; silent looping MP4 files can be up to 10 MB.</p>
      <div className="admin-hero-row-list">
        {ordered.map((slide) => {
          const media = mediaUrl(slide);
          return (
            <article
              key={slide.id}
              draggable
              onDragStart={() => setDraggedId(slide.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => reorder(slide.id)}
              className={draggedId === slide.id ? "is-dragging" : ""}
            >
              <button className="hero-drag-handle" type="button" aria-label={`Drag ${slide.title || "untitled slide"} to reorder`} title="Drag to reorder">⋮⋮</button>
              <div className="admin-hero-row-thumb">
                {slide.mediaType === "video" && media ? <video src={media} poster={slide.hasPoster ? `${media}?poster=1` : undefined} muted playsInline preload="metadata" /> : media ? <Image unoptimized src={media} alt="" fill sizes="150px" /> : <span>No media</span>}
              </div>
              <div className="admin-hero-row-copy">
                <span>{slide.eyebrow || "No eyebrow"}</span>
                <strong>{slide.title || "Untitled slide"}</strong>
                <em>{slide.accentText || "No accent line"}</em>
              </div>
              <span className={slide.isActive ? "hero-row-status is-active" : "hero-row-status"}>{slide.isActive ? "Active" : "Hidden"}</span>
              <div className="admin-row-actions">
                <button type="button" onClick={() => setEditor(slide)}>Edit</button>
                <button className="admin-hero-delete" type="button" onClick={() => remove(slide)}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>
      {editor && <SlideModal slide={editor === "new" ? null : editor} order={ordered.length} onClose={() => setEditor(null)} />}
    </div>
  );
}
