import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCurrentMember } from "@/lib/auth";
import { eventMediaValues } from "@/lib/event-media";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const poster = new URL(request.url).searchParams.get("poster") === "1";
  const [event] = await db
    .select({
      mediaData: events.mediaData,
      mediaMime: events.mediaMime,
      posterData: events.posterData,
      posterMime: events.posterMime,
      mediaType: events.mediaType,
      imagePath: events.imagePath,
      isPublished: events.isPublished,
      updatedAt: events.updatedAt,
    })
    .from(events)
    .where(eq(events.id, (await params).id))
    .limit(1);
  if (!event?.isPublished) return new Response(null, { status: 404 });
  const data = poster && event.posterData ? event.posterData : event.mediaData;
  const mime = poster && event.posterData ? event.posterMime : event.mediaMime;
  if (!data || !mime) return NextResponse.redirect(new URL(event.imagePath, request.url));
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
      "last-modified": event.updatedAt.toUTCString(),
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, member] = await Promise.all([getCurrentAdmin(), getCurrentMember()]);
  const id = (await params).id;
  if (!admin && !member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Event owner or admin required." }, { status: 401 });
  }
  try {
    const values = await eventMediaValues(await request.formData());
    const where = admin
      ? eq(events.id, id)
      : and(eq(events.id, id), eq(events.ownerId, member!.id));
    const [updated] = await db
      .update(events)
      .set(values)
      .where(where)
      .returning({ id: events.id });
    if (!updated) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message === "INVALID_EVENT_POSTER"
      ? "The MP4 needs a generated poster image."
      : "Upload a cropped 1920×1080 JPEG/PNG or a 16:9 looping MP4 under 5 MB.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
