"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { SiteBranding } from "@/lib/site-branding";

declare global { interface Window { __siteBranding?: SiteBranding } }

export default function SiteBrandingRuntime() {
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    fetch("/api/site-branding", { cache: "no-store" }).then((response) => response.json()).then((settings: SiteBranding) => {
      if (!active) return;
      window.__siteBranding = settings;
      const root = document.documentElement;
      root.style.setProperty("--accent", settings.primaryColor);
      root.style.setProperty("--pink", settings.primaryColor);
      root.style.setProperty("--theme-dark", settings.darkColor);
      // The live platform stays dark; lightColor/textColor are retained for the admin's light preview.
      root.style.setProperty("--paper", settings.darkColor);
      root.style.setProperty("--ink", settings.bodyTextColor);
      root.style.setProperty("--muted", settings.mutedColor);
      root.style.setProperty("--success", settings.successColor);
      root.style.setProperty("--warning", settings.warningColor);
      root.style.setProperty("--danger", settings.dangerColor);
      root.style.setProperty("--heading-color", settings.headingColor);
      root.style.setProperty("--body-text-color", settings.bodyTextColor);
      root.style.setProperty("--header-background", settings.headerBackgroundColor);
      root.style.setProperty("--header-text", settings.headerTextColor);
      root.style.setProperty("--surface-color", settings.surfaceColor);
      root.style.setProperty("--input-background", settings.inputBackgroundColor);
      root.style.setProperty("--input-text", settings.inputTextColor);
      root.style.setProperty("--input-focus", settings.inputFocusColor);
      root.style.setProperty("--link-color", settings.linkColor);
      root.style.setProperty("--link-hover-color", settings.linkHoverColor);
      root.style.setProperty("--brand-border", settings.borderColor);
      root.style.setProperty("--button-background", settings.buttonBackgroundColor);
      root.style.setProperty("--button-text", settings.buttonTextColor);
      root.style.setProperty("--button-hover", settings.buttonHoverColor);
      root.style.setProperty("--button-radius", `${settings.buttonRadius}px`);
      root.style.setProperty("--dropdown-background", settings.dropdownBackgroundColor);
      root.style.setProperty("--dropdown-text", settings.dropdownTextColor);
      root.style.setProperty("--dropdown-hover", settings.dropdownHoverColor);
      root.style.setProperty("--body-font-size", `${settings.bodyFontSize}px`);
      root.style.setProperty("--body-line-height", `${settings.bodyLineHeight}px`);
      root.style.setProperty("--heading-xl", `${settings.headingXlSize}px`);
      root.style.setProperty("--heading-lg", `${settings.headingLgSize}px`);
      root.style.setProperty("--heading-md", `${settings.headingMdSize}px`);
      document.querySelectorAll<HTMLElement>("[data-platform-name]").forEach((node) => { node.textContent = settings.platformName; });
      document.querySelectorAll<HTMLElement>("[data-platform-short-name]").forEach((node) => { node.textContent = settings.shortName; });
      document.querySelectorAll<HTMLElement>("[data-platform-brand]").forEach((node) => {
        if (!settings.logoPath) { node.textContent = settings.shortName; return; }
        node.textContent = "";
        const image = document.createElement("img"); image.src = settings.logoPath; image.alt = settings.platformName; image.className = "site-brand-logo"; node.appendChild(image);
      });
      if (settings.faviconPath) {
        let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
        icon.href = settings.faviconPath;
      } else {
        document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.remove();
      }
      document.title = document.title.replace(/Model Escape/gi, settings.platformName);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);
  return null;
}
