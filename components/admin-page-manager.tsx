"use client";

import { FormEvent, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media-library";
import AdminMediaPicker from "@/components/admin-media-picker";

export type AdminPageSetting = {
  pageKey: string;
  eyebrow: string;
  title: string;
  intro: string;
  imagePath: string;
  headerBackgroundColor: string;
  content: Record<string, string>;
  seoTitle: string;
  seoDescription: string;
  shareImagePath: string;
};

export default function AdminPageManager({ initialPages, mediaItems: initialMediaItems = [] }: { initialPages: AdminPageSetting[]; mediaItems?: AdminMediaItem[] }) {
  const [pages, setPages] = useState(initialPages);
  const [mediaItems, setMediaItems] = useState(initialMediaItems);
  const [active, setActive] = useState(initialPages[0]?.pageKey ?? "home");
  const [message, setMessage] = useState("");
  const page = pages.find((item) => item.pageKey === active);
  if (!page) return null;

  function updateMedia(key: "imagePath" | "shareImagePath", value: string) {
    setPages((current) => current.map((item) => item.pageKey === active ? { ...item, [key]: value } : item));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving…");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/admin/pages", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "Page settings could not be saved.");
    setPages((current) => current.map((item) => item.pageKey === active ? result.page : item));
    setMessage("Page content saved.");
  }

  return (
    <section className="admin-page-manager">
      <div className="admin-heading">
        <div><p className="astryx-kicker">PUBLIC PAGE CONTENT</p><h2>Pages</h2></div>
        <span className="admin-count">Edit headings, hero media and sharing previews</span>
      </div>
      <nav className="admin-page-tabs">
        {pages.map((item) => <button type="button" className={item.pageKey === active ? "is-active" : ""} onClick={() => { setActive(item.pageKey); setMessage(""); }} key={item.pageKey}>{item.pageKey}</button>)}
      </nav>
      <form className="admin-page-form" onSubmit={save} key={page.pageKey}>
        <input type="hidden" name="pageKey" value={page.pageKey} />
        <label>Eyebrow<input name="eyebrow" defaultValue={page.eyebrow} /></label>
        <label>Page title<input name="title" defaultValue={page.title} required /></label>
        <label className="admin-page-color">Header color<div><input name="headerBackgroundColor" type="color" defaultValue={page.headerBackgroundColor || "#11110f"} /><span>{page.headerBackgroundColor || "#11110f"}</span></div></label>
        <label className="full">Intro<textarea name="intro" rows={4} defaultValue={page.intro} /></label>
        <div className="full"><AdminMediaPicker label="Hero image" value={page.imagePath} items={mediaItems} onItemsChange={setMediaItems} onChange={(value) => updateMedia("imagePath", value)} /></div>
        <input type="hidden" name="imagePath" value={page.imagePath} />
        <label className="full">SEO title<input name="seoTitle" defaultValue={page.seoTitle} maxLength={160} /></label>
        <label className="full">SEO description<textarea name="seoDescription" rows={3} defaultValue={page.seoDescription} maxLength={320} /></label>
        <div className="full"><AdminMediaPicker label="Social sharing image" value={page.shareImagePath} items={mediaItems} onItemsChange={setMediaItems} onChange={(value) => updateMedia("shareImagePath", value)} /></div>
        <input type="hidden" name="shareImagePath" value={page.shareImagePath} />
        {active === "home" && <fieldset className="admin-home-content-editor full"><legend>Built for the work</legend><label>Eyebrow<input name="builtEyebrow" defaultValue={page.content.builtEyebrow} /></label><label>Title<input name="builtTitle" defaultValue={page.content.builtTitle} /></label><label className="full">Body text<textarea name="builtIntro" rows={4} defaultValue={page.content.builtIntro} /></label></fieldset>}
        {active === "home" && <fieldset className="admin-home-content-editor full"><legend>Founding membership</legend><label>Eyebrow<input name="membershipEyebrow" defaultValue={page.content.membershipEyebrow} /></label><label>Title<input name="membershipTitle" defaultValue={page.content.membershipTitle} /></label><label className="full">Body text<textarea name="membershipIntro" rows={4} defaultValue={page.content.membershipIntro} /></label></fieldset>}
        <button className="button" type="submit">Save page ↗</button>
        {message && <p role="status">{message}</p>}
      </form>
      {active === "home" && <p className="prototype-note">Homepage slideshow media, order, buttons, and individual slide text remain managed in Homepage Media.</p>}
    </section>
  );
}
