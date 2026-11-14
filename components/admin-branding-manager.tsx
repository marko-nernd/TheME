"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { SiteBranding } from "@/lib/site-branding";
import type { AdminMediaItem } from "@/lib/admin-media-library";
import AdminMediaPicker from "@/components/admin-media-picker";

const colorFields: Array<[keyof SiteBranding, string]> = [
  ["primaryColor", "Primary / accent"], ["darkColor", "Dark background"], ["lightColor", "Light background"],
  ["textColor", "Primary text"], ["mutedColor", "Muted text"], ["successColor", "Success"],
  ["warningColor", "Warning"], ["dangerColor", "Error / danger"],
  ["headingColor", "Headings"], ["bodyTextColor", "Body text"], ["linkColor", "Links"],
  ["headerBackgroundColor", "Site header background"], ["headerTextColor", "Site header text"], ["surfaceColor", "Cards / surfaces"],
  ["inputBackgroundColor", "Form field background"], ["inputTextColor", "Form field text"], ["inputFocusColor", "Form field focus"],
  ["linkHoverColor", "Link hover"], ["borderColor", "Borders / dividers"],
  ["buttonBackgroundColor", "Button background"], ["buttonTextColor", "Button text"], ["buttonHoverColor", "Button hover"],
  ["dropdownBackgroundColor", "Dropdown background"], ["dropdownTextColor", "Dropdown text"], ["dropdownHoverColor", "Dropdown hover"],
];

export default function AdminBrandingManager({ initialSettings, mediaItems: initialMediaItems = [] }: { initialSettings: SiteBranding; mediaItems?: AdminMediaItem[] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [mediaItems, setMediaItems] = useState(initialMediaItems);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const importRef = useRef<HTMLInputElement>(null);

  function update(key: keyof SiteBranding, value: string) { setSettings((current) => ({ ...current, [key]: value })); }

  async function persist(action: "save" | "restore" | "reset", next = settings) {
    setSaving(true); setMessage(action === "restore" ? "Restoring…" : action === "reset" ? "Restoring defaults…" : "Saving…");
    const response = await fetch("/api/admin/branding", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, settings: next }) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(result.error || "Brand settings could not be saved.");
    setSettings(result.settings); setMessage(action === "restore" ? "Configuration restored." : action === "reset" ? "Default theme restored." : "Branding and theme saved.");
    window.setTimeout(() => window.location.reload(), 650);
  }

  function submit(event: FormEvent) { event.preventDefault(); void persist("save"); }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data?.format !== "model-escape-branding" || data?.version !== 1 || !data?.settings) throw new Error("Unsupported configuration file.");
      await persist("restore", data.settings);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Configuration file could not be read."); }
  }

  async function exportSettings() {
    setMessage("Preparing export…");
    const response = await fetch("/api/admin/branding", { cache: "no-store" });
    if (!response.ok) return setMessage("Configuration could not be exported.");
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `model-escape-branding-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
    setMessage("Configuration exported.");
  }

  return <section className="admin-branding-manager">
    <div className="admin-heading"><div><p className="astryx-kicker">GLOBAL APPEARANCE</p><h2>Branding &amp; theme</h2></div><span className="admin-count">Website-wide configuration</span></div>
    <div className="admin-branding-actions">
      <button type="button" onClick={exportSettings}>Export configuration ↓</button>
      <button type="button" onClick={() => importRef.current?.click()}>Restore from JSON ↑</button>
      <button type="button" className="is-danger" onClick={() => window.confirm("Restore the original Model Escape name and colors?") && void persist("reset")}>Restore defaults</button>
      <input ref={importRef} type="file" accept="application/json,.json" onChange={restore} hidden />
    </div>
    <div className="admin-branding-layout">
      <form className="admin-page-form admin-branding-form" onSubmit={submit}>
        <label>Platform title<input value={settings.platformName} onChange={(e) => update("platformName", e.target.value)} maxLength={80} required /></label>
        <label>Short header name<input value={settings.shortName} onChange={(e) => update("shortName", e.target.value)} maxLength={40} required /></label>
        <AdminMediaPicker label="Logo" value={settings.logoPath} items={mediaItems} onItemsChange={setMediaItems} onChange={(value) => update("logoPath", value)} hint="Optional. The short header name is used when no logo is selected." />
        <AdminMediaPicker label="Favicon" value={settings.faviconPath} items={mediaItems} onItemsChange={setMediaItems} onChange={(value) => update("faviconPath", value)} hint="A square image works best." />
        <div className="full"><AdminMediaPicker label="Default sharing image" value={settings.shareImagePath} items={mediaItems} onItemsChange={setMediaItems} onChange={(value) => update("shareImagePath", value)} hint="Used when a page does not have its own sharing image." /></div>
        <fieldset className="full admin-navigation-images"><legend>Navigation dropdown images</legend>
          <p>Choose the image on the right of each large desktop menu. Images are cropped to fill the preview. Removing a selection restores the original image when saved.</p>
          <div className="admin-navigation-image-grid">
            {([["menuEventsImagePath", "Events"], ["menuCommunityImagePath", "Community"], ["menuHostImagePath", "Host"]] as const).map(([key, label]) => <div key={key}>
              <AdminMediaPicker label={`${label} menu image`} value={settings[key]} items={mediaItems} onItemsChange={setMediaItems} onChange={(value) => update(key, value)} hint="Choose from the media library or upload a new image." />
            </div>)}
          </div>
          <button className="button admin-branding-save" type="submit" disabled={saving}>{saving ? "Saving…" : "Save dropdown images"}</button>
        </fieldset>
        <fieldset className="full admin-color-grid"><legend>Theme colors</legend>{colorFields.map(([key, label]) => <label key={key}>{label}<span><input type="color" value={settings[key]} onChange={(e) => update(key, e.target.value)} /><input value={settings[key]} onChange={(e) => update(key, e.target.value)} pattern="#[0-9A-Fa-f]{6}" maxLength={7} /></span></label>)}</fieldset>
        <fieldset className="full admin-control-style-grid"><legend>Controls and body text</legend>
          <label>Button corners<select value={settings.buttonRadius} onChange={(e) => update("buttonRadius", e.target.value)}><option value="0">Square</option><option value="8">Soft · 8 px</option><option value="16">Rounded · 16 px</option><option value="999">Pill</option></select></label>
          <label><span>Body font size <b>{settings.bodyFontSize} px</b></span><input type="range" min="14" max="24" value={settings.bodyFontSize} onChange={(e) => update("bodyFontSize", e.target.value)} /></label>
          <label><span>Body line height <b>{settings.bodyLineHeight} px</b></span><input type="range" min="18" max="40" value={settings.bodyLineHeight} onChange={(e) => update("bodyLineHeight", e.target.value)} /></label>
        </fieldset>
        <fieldset className="full admin-heading-size-grid"><legend>Preview heading sizes</legend>
          {([ ["headingXlSize", "Page / hero heading", 40, 120], ["headingLgSize", "Section heading", 28, 88], ["headingMdSize", "Card heading", 18, 56] ] as const).map(([key, label, min, max]) => <label key={key}><span>{label}<b>{settings[key]} px</b></span><input type="range" min={min} max={max} step="1" value={settings[key]} onChange={(e) => update(key, e.target.value)} /></label>)}
        </fieldset>
        <button className="button admin-branding-save" type="submit" disabled={saving}>{saving ? "Saving…" : "Save branding & theme ↗"}</button>
        {message && <p className="admin-branding-message" role="status">{message}</p>}
      </form>
      <aside className={`admin-theme-preview is-${previewMode}`} style={{ background: previewMode === "light" ? settings.lightColor : settings.darkColor, color: previewMode === "light" ? settings.textColor : "#ffffff" }}>
        <div className="admin-preview-mode" aria-label="Preview color mode"><button type="button" className={previewMode === "light" ? "is-active" : ""} onClick={() => setPreviewMode("light")}>Light</button><button type="button" className={previewMode === "dark" ? "is-active" : ""} onClick={() => setPreviewMode("dark")}>Dark</button></div>
        <header style={{ background: settings.headerBackgroundColor, color: settings.headerTextColor }}><strong>{settings.logoPath ? <img src={settings.logoPath} alt={settings.platformName} /> : settings.shortName}</strong><span>Events&nbsp;&nbsp; Models&nbsp;&nbsp; Membership</span></header>
        <div className="admin-theme-preview-content"><small style={{ color: settings.primaryColor }}>LIVE THEME PREVIEW</small><h3 style={{ fontSize: `${settings.headingXlSize}px`, color: previewMode === "light" ? settings.headingColor : "#ffffff" }}>{settings.platformName}</h3><h4 style={{ fontSize: `${settings.headingLgSize}px`, color: previewMode === "light" ? settings.headingColor : "#ffffff" }}>Section heading</h4><h5 style={{ fontSize: `${settings.headingMdSize}px`, color: previewMode === "light" ? settings.headingColor : "#ffffff" }}>Card heading</h5><p style={{ color: previewMode === "light" ? settings.bodyTextColor : "rgba(255,255,255,.82)", fontSize: `${settings.bodyFontSize}px`, lineHeight: `${settings.bodyLineHeight}px` }}>Body text shows the default reading size, line spacing, and color. Creative people can scan this content comfortably across the platform.</p><p className="admin-preview-muted" style={{ color: previewMode === "light" ? settings.mutedColor : "rgba(255,255,255,.62)" }}>Muted supporting text provides useful context without competing with the main message.</p><div className="admin-preview-links"><a href="#preview" onClick={(event) => event.preventDefault()} style={{ color: settings.linkColor }}>Example text link ↗</a><a href="#preview" onClick={(event) => event.preventDefault()} style={{ color: settings.linkHoverColor }}>Link hover state ↗</a></div>
          <div className="admin-preview-buttons"><button style={{ background: settings.buttonBackgroundColor, color: settings.buttonTextColor, borderColor: settings.buttonBackgroundColor, borderRadius: `${settings.buttonRadius}px` }}>Primary action</button><button style={{ background: settings.buttonHoverColor, color: settings.buttonTextColor, borderColor: settings.buttonHoverColor, borderRadius: `${settings.buttonRadius}px` }}>Button hover</button><button className="is-outline" style={{ color: previewMode === "light" ? settings.headingColor : "#fff", borderColor: settings.borderColor, borderRadius: `${settings.buttonRadius}px` }}>Secondary action</button></div>
          <div className="admin-preview-dropdown" style={{ background: settings.dropdownBackgroundColor, color: settings.dropdownTextColor, borderColor: settings.borderColor }}><b>Account menu⌄</b><a style={{ color: settings.dropdownTextColor }}>View profile</a><a className="is-hover" style={{ background: settings.dropdownHoverColor, color: settings.dropdownTextColor }}>Billing · hover</a><a style={{ color: settings.dropdownTextColor }}>Sign out</a></div>
          <div className="admin-preview-card" style={{ background: settings.surfaceColor, borderColor: settings.borderColor, color: settings.bodyTextColor }}><b style={{ color: settings.headingColor }}>Card and form preview</b><label>Email address<input value="member@example.com" readOnly style={{ background: settings.inputBackgroundColor, color: settings.inputTextColor, borderColor: settings.inputFocusColor }} /></label><label>Account type<select defaultValue="Model" style={{ background: settings.inputBackgroundColor, color: settings.inputTextColor, borderColor: settings.borderColor }}><option>Model</option></select></label></div>
          <ul><li style={{ color: settings.successColor }}>Success message</li><li style={{ color: settings.warningColor }}>Warning message</li><li style={{ color: settings.dangerColor }}>Error message</li></ul>
        </div>
      </aside>
    </div>
    <p className="prototype-note">Exports contain presentation settings only—never passwords, Stripe keys, API credentials, or member data.</p>
  </section>;
}
