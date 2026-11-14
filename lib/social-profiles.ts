export const socialPlatforms = {
  x: { label: "X", prefix: "https://x.com/", hosts: ["x.com", "twitter.com"] },
  instagram: { label: "Instagram", prefix: "https://www.instagram.com/", hosts: ["instagram.com"] },
  youtube: { label: "YouTube", prefix: "https://www.youtube.com/@", hosts: ["youtube.com"] },
  onlyfans: { label: "OnlyFans", prefix: "https://onlyfans.com/", hosts: ["onlyfans.com"] },
} as const;
export type SocialPlatform = keyof typeof socialPlatforms;
export function normalizeSocialProfile(platform: SocialPlatform, input: unknown): string | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const config = socialPlatforms[platform];
  let handle = input.trim();
  if (/^https?:\/\//i.test(handle)) {
    const url = new URL(handle);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !config.hosts.some((host) => url.hostname === host || url.hostname === `www.${host}`)) throw new Error(`Enter a valid ${config.label} username or profile link.`);
    handle = url.pathname.replace(/^\/+|\/+$/g, "");
    if (platform === "youtube" && /^(channel|c|user)\/[A-Za-z0-9_-]+$/.test(handle)) return `https://www.youtube.com/${handle}`;
  }
  handle = handle.replace(/^@/, "").replace(/\/$/, "");
  if (!/^[\p{L}\p{N}_.-]{1,100}$/u.test(handle)) throw new Error(`Enter a valid ${config.label} username.`);
  return config.prefix + encodeURIComponent(handle);
}
export function socialUsername(platform: SocialPlatform, input?: string | null): string {
  if (!input) return "";
  try { const url = normalizeSocialProfile(platform, input); if (!url) return ""; const path = decodeURIComponent(new URL(url).pathname).replace(/^\/+|\/+$/g, ""); return platform === "youtube" && !path.startsWith("@") ? url : path.replace(/^@/, ""); } catch { return input; }
}
