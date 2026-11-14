import { eq } from "drizzle-orm";
import { db } from "@/db";
import { homeHeroSlides } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const wantsPoster = new URL(request.url).searchParams.get("poster") === "1";
  const [slide] = await db
    .select({
      data: homeHeroSlides.mediaData,
      mime: homeHeroSlides.mediaMime,
      posterData: homeHeroSlides.posterData,
      posterMime: homeHeroSlides.posterMime,
      updatedAt: homeHeroSlides.updatedAt,
      active: homeHeroSlides.isActive,
    })
    .from(homeHeroSlides)
    .where(eq(homeHeroSlides.id, id))
    .limit(1);
  const data = wantsPoster ? slide?.posterData : slide?.data;
  const mime = wantsPoster ? slide?.posterMime : slide?.mime;
  if (!slide?.active || !data || !mime) {
    return new Response(null, { status: 404 });
  }
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) return new Response(null, { status: 416, headers: { "content-range": `bytes */${data.length}` } });
    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
    if (start >= data.length || end < start) return new Response(null, { status: 416, headers: { "content-range": `bytes */${data.length}` } });
    const chunk = data.subarray(start, end + 1);
    return new Response(new Uint8Array(chunk), { status: 206, headers: {
      "content-type": mime, "content-length": String(chunk.length), "content-range": `bytes ${start}-${end}/${data.length}`, "accept-ranges": "bytes", "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    } });
  }
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": mime,
      "content-length": String(data.length),
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      "last-modified": slide.updatedAt.toUTCString(),
    },
  });
}
