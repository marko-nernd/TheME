import { NextResponse } from "next/server";
import { getPublishedEvents } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getPublishedEvents();
    return NextResponse.json({
      events: rows.map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        category: event.category,
        location: event.location,
        startsAt: event.startsAt.toISOString(),
        priceCents: event.priceCents,
        mediaType: event.hasMedia && event.mediaType === "video" ? "video" : "image",
        imagePath: event.hasMedia ? `/api/events/${event.id}/media` : event.imagePath,
        posterPath: event.hasMedia && event.mediaType === "video" ? `/api/events/${event.id}/media?poster=1` : null,
      })),
    });
  } catch (error) {
    console.error("Unable to load mobile events", error);
    return NextResponse.json({ error: "Unable to load events." }, { status: 500 });
  }
}
