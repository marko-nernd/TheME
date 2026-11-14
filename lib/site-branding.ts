import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteBrandSettings } from "@/db/schema";

export const defaultSiteBranding = {
  id: "default",
  platformName: "Model Escape",
  shortName: "MODEL ESCAPE",
  logoPath: "",
  faviconPath: "/favicon.svg",
  shareImagePath: "/og.png",
  menuEventsImagePath: "/images/desert-production.png",
  menuCommunityImagePath: "/images/poolside-network.png",
  menuHostImagePath: "/images/creative-planning.png",
  primaryColor: "#ff2d95",
  darkColor: "#141519",
  lightColor: "#f1efe8",
  textColor: "#11110f",
  mutedColor: "#a7a9b6",
  successColor: "#16834f",
  warningColor: "#b68118",
  dangerColor: "#a31616",
  headingColor: "#f1f2f6",
  bodyTextColor: "#f1f2f6",
  headerBackgroundColor: "#191a20",
  headerTextColor: "#ffffff",
  surfaceColor: "#202127",
  inputBackgroundColor: "#17181d",
  inputTextColor: "#f1f2f6",
  inputFocusColor: "#ff2d95",
  linkColor: "#ff72b8",
  linkHoverColor: "#ff2d95",
  borderColor: "#34353f",
  buttonBackgroundColor: "#ff2d95",
  buttonTextColor: "#ffffff",
  buttonHoverColor: "#d90072",
  buttonRadius: "8",
  dropdownBackgroundColor: "#202127",
  dropdownTextColor: "#ffffff",
  dropdownHoverColor: "#ff2d95",
  bodyFontSize: "16",
  bodyLineHeight: "26",
  headingXlSize: "48",
  headingLgSize: "40",
  headingMdSize: "24",
} as const;

export type SiteBranding = { [K in keyof typeof defaultSiteBranding]: string };

export async function getSiteBranding(): Promise<SiteBranding> {
  const [row] = await db.select().from(siteBrandSettings).where(eq(siteBrandSettings.id, "default")).limit(1);
  if (!row) return { ...defaultSiteBranding };
  return Object.fromEntries(Object.keys(defaultSiteBranding).map((key) => [key, String(row[key as keyof typeof row] ?? defaultSiteBranding[key as keyof typeof defaultSiteBranding])])) as SiteBranding;
}

const hexPattern = /^#[0-9a-f]{6}$/i;
export function cleanSiteBranding(input: unknown): SiteBranding {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const text = (key: keyof SiteBranding, max: number) => typeof body[key] === "string" ? body[key].trim().slice(0, max) : defaultSiteBranding[key];
  const color = (key: keyof SiteBranding) => {
    const value = text(key, 7);
    return hexPattern.test(value) ? value.toLowerCase() : defaultSiteBranding[key];
  };
  const size = (key: keyof SiteBranding, min: number, max: number) => String(Math.min(max, Math.max(min, Number.parseInt(text(key, 3), 10) || Number(defaultSiteBranding[key]))));
  const menuImage = (key: keyof SiteBranding) => {
    const value = text(key, 500);
    const localImage = /^\/(?!\/)[^?#\\\s]+\.(png|jpe?g|webp|avif|svg|gif)$/i.test(value);
    const uploadedImage = /^\/api\/site-media\/[0-9a-f-]{36}$/i.test(value) || /^\/api\/(events|hero-slides)\/[0-9a-f-]{36}\/media$/i.test(value) || /^\/api\/members\/[0-9a-f-]{36}\/avatar$/i.test(value);
    return value === "" || ((localImage || uploadedImage) && !value.split("/").includes("..")) ? value : defaultSiteBranding[key];
  };
  return {
    id: "default",
    platformName: text("platformName", 80) || defaultSiteBranding.platformName,
    shortName: text("shortName", 40) || defaultSiteBranding.shortName,
    logoPath: text("logoPath", 500),
    faviconPath: text("faviconPath", 500),
    shareImagePath: text("shareImagePath", 500),
    menuEventsImagePath: menuImage("menuEventsImagePath"),
    menuCommunityImagePath: menuImage("menuCommunityImagePath"),
    menuHostImagePath: menuImage("menuHostImagePath"),
    primaryColor: color("primaryColor"), darkColor: color("darkColor"), lightColor: color("lightColor"),
    textColor: color("textColor"), mutedColor: color("mutedColor"), successColor: color("successColor"),
    warningColor: color("warningColor"), dangerColor: color("dangerColor"),
    headingColor: color("headingColor"), bodyTextColor: color("bodyTextColor"),
    headerBackgroundColor: color("headerBackgroundColor"), headerTextColor: color("headerTextColor"), surfaceColor: color("surfaceColor"),
    inputBackgroundColor: color("inputBackgroundColor"), inputTextColor: color("inputTextColor"), inputFocusColor: color("inputFocusColor"),
    linkColor: color("linkColor"), linkHoverColor: color("linkHoverColor"), borderColor: color("borderColor"),
    buttonBackgroundColor: color("buttonBackgroundColor"), buttonTextColor: color("buttonTextColor"), buttonHoverColor: color("buttonHoverColor"),
    buttonRadius: size("buttonRadius", 0, 999),
    dropdownBackgroundColor: color("dropdownBackgroundColor"), dropdownTextColor: color("dropdownTextColor"), dropdownHoverColor: color("dropdownHoverColor"),
    bodyFontSize: size("bodyFontSize", 14, 24), bodyLineHeight: size("bodyLineHeight", 18, 40),
    headingXlSize: size("headingXlSize", 40, 120),
    headingLgSize: size("headingLgSize", 28, 88),
    headingMdSize: size("headingMdSize", 18, 56),
  };
}
