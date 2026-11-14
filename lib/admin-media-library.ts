import "server-only";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import generatedUsage from "./generated-media-usage.json";
import { pool } from "@/db";

const mediaExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".mp4"]);

export type AdminMediaItem = {
  id: string;
  path: string;
  previewUrl: string;
  kind: "image" | "video";
  storage: "file" | "database";
  location: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  usages: string[];
  canDelete: boolean;
};

export function mediaPublicRoot() {
  return path.resolve(process.env.MEDIA_LIBRARY_ROOT ?? path.join(process.cwd(), "public"));
}

async function walkMedia(directory: string, root: string): Promise<Array<{ absolute: string; publicPath: string; size: number }>> {
  const items: Array<{ absolute: string; publicPath: string; size: number }> = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) items.push(...await walkMedia(absolute, root));
    else if (mediaExtensions.has(path.extname(entry.name).toLowerCase())) {
      items.push({
        absolute,
        publicPath: `/${path.relative(root, absolute).split(path.sep).join("/")}`,
        size: (await stat(absolute)).size,
      });
    }
  }
  return items;
}

export async function getAdminMediaLibrary(): Promise<AdminMediaItem[]> {
  const root = mediaPublicRoot();
  const [files, references, databaseMedia] = await Promise.all([
    walkMedia(root, root),
    pool.query(`
      select path, usage from (
        select image_path as path, 'Profile · ' || name as usage from profiles
        union all
        select pi.image_path, 'Portfolio · ' || p.name from portfolio_items pi join profiles p on p.id = pi.profile_id
        union all
        select image_path, 'Event · ' || title from events
        union all
        select media_path, 'Homepage hero · ' || coalesce(nullif(title, ''), 'Untitled slide') from home_hero_slides where media_path is not null
        union all
        select logo_path, 'Branding · Logo' from site_brand_settings where logo_path <> ''
        union all
        select favicon_path, 'Branding · Favicon' from site_brand_settings where favicon_path <> ''
        union all
        select share_image_path, 'Branding · Default sharing image' from site_brand_settings where share_image_path <> ''
        union all
        select menu_events_image_path, 'Navigation dropdown · Events' from site_brand_settings where menu_events_image_path <> ''
        union all
        select menu_community_image_path, 'Navigation dropdown · Community' from site_brand_settings where menu_community_image_path <> ''
        union all
        select menu_host_image_path, 'Navigation dropdown · Host' from site_brand_settings where menu_host_image_path <> ''
        union all
        select image_path, 'Page hero · ' || page_key from site_page_settings where image_path <> ''
        union all
        select share_image_path, 'Page sharing image · ' || page_key from site_page_settings where share_image_path <> ''
      ) media_references where path is not null
    `),
    pool.query(`
      select * from (
        select 'event:' || id as id, '/api/events/' || id || '/media' as preview_url,
          case when media_type = 'video' then 'video' else 'image' end as kind,
          'PostgreSQL · events.media_data' as location,
          octet_length(media_data)::int as size_bytes,
          'Event · ' || title as usage, null::int as width, null::int as height
        from events where media_data is not null
        union all
        select 'hero:' || id, '/api/hero-slides/' || id || '/media',
          case when media_type = 'video' then 'video' else 'image' end,
          'PostgreSQL · home_hero_slides.media_data',
          octet_length(media_data)::int,
          'Homepage hero · ' || coalesce(nullif(title, ''), 'Untitled slide'), null::int, null::int
        from home_hero_slides where media_data is not null
        union all
        select 'avatar:' || id, '/api/members/' || id || '/avatar', 'image',
          'PostgreSQL · members.avatar_data', octet_length(avatar_data)::int,
          'Profile avatar · ' || name, 500, 500
        from members where avatar_data is not null
        union all
        select 'site:' || id, '/api/site-media/' || id,
          case when mime_type = 'video/mp4' then 'video' else 'image' end,
          'PostgreSQL · site_media_assets.data', size_bytes,
          '', width, height
        from site_media_assets
      ) media
    `),
  ]);
  const dbUsage = new Map<string, string[]>();
  for (const row of references.rows) {
    const current = dbUsage.get(row.path) ?? [];
    current.push(row.usage);
    dbUsage.set(row.path, current);
  }
  const codeUsage = generatedUsage as Record<string, string[]>;
  const fileItems: AdminMediaItem[] = files.map((file) => {
    const usages = [...(dbUsage.get(file.publicPath) ?? []), ...(codeUsage[file.publicPath] ?? []).map((value) => `Source · ${value}`)];
    return {
      id: `file:${file.publicPath}`,
      path: file.publicPath,
      previewUrl: file.publicPath,
      kind: path.extname(file.publicPath).toLowerCase() === ".mp4" ? "video" : "image",
      storage: "file",
      location: `public${file.publicPath}`,
      sizeBytes: file.size,
      usages: [...new Set(usages)],
      canDelete: usages.length === 0,
    };
  });
  return [
    ...fileItems,
    ...databaseMedia.rows.map((item): AdminMediaItem => {
      const usages = item.id.startsWith("site:") ? (dbUsage.get(item.preview_url) ?? []) : [item.usage];
      return ({
      id: item.id,
      path: item.preview_url,
      previewUrl: item.preview_url,
      kind: item.kind,
      storage: "database",
      location: item.location,
      sizeBytes: item.size_bytes,
      width: item.width,
      height: item.height,
      usages,
      canDelete: item.id.startsWith("site:") && usages.length === 0,
    }); }),
  ].sort((a, b) => Number(a.canDelete) - Number(b.canDelete) || a.path.localeCompare(b.path));
}

export async function deleteUnusedPublicMedia(candidatePaths: Array<string | null | undefined>) {
  const requested = new Set(candidatePaths.filter((value): value is string => Boolean(value?.startsWith("/"))));
  if (!requested.size) return [];
  const root = mediaPublicRoot();
  const library = await getAdminMediaLibrary();
  const deleted: string[] = [];
  for (const item of library) {
    if (item.storage !== "file" || !item.canDelete || !requested.has(item.path)) continue;
    const absolute = path.resolve(root, `.${item.path}`);
    if (!absolute.startsWith(`${root}${path.sep}`)) continue;
    try {
      await unlink(absolute);
      deleted.push(item.path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`Unused member media could not be removed: ${item.path}`, error);
      }
    }
  }
  return deleted;
}
