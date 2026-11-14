import { NextResponse } from "next/server";
import { getEventAttendingModels, getEventAttendingPhotographers, getEventHost, getEventParticipationAvailability, getEventSponsors, getPublishedEvents } from "@/db/queries";
import { defaultParticipationPaths } from "@/lib/participation";
import { shouldRevealRemainingSpots } from "@/lib/event-availability";
import { eventCustomerCheckoutCents } from "@/lib/platform-fees";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const event = (await getPublishedEvents()).find((item) => item.id === id);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    const [participationCounts, attendingModels, attendingPhotographers, sponsors, host] = await Promise.all([
      getEventParticipationAvailability(id), getEventAttendingModels(id), getEventAttendingPhotographers(id), getEventSponsors(id), getEventHost(id),
    ]);
    const paths = event.participationPaths.length ? event.participationPaths : defaultParticipationPaths;
    const eventRemainingIsPublic = shouldRevealRemainingSpots(event.capacity, event.spotsRemaining);
    return NextResponse.json({ event: {
      ...event,
      spotsRemaining: eventRemainingIsPublic ? event.spotsRemaining : null,
      isAvailable: event.spotsRemaining > 0,
      startsAt: event.startsAt.toISOString(), endsAt: event.endsAt?.toISOString() ?? null,
      createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString(),
      media: { type: event.hasMedia && event.mediaType === "video" ? "video" : "image", url: event.hasMedia ? `/api/events/${id}/media` : event.imagePath, posterUrl: event.hasMedia && event.mediaType === "video" ? `/api/events/${id}/media?poster=1` : null },
      participationPaths: paths.map((path) => {
        const remaining = Math.max(0, path.capacity - (participationCounts[path.type] ?? 0));
        const checkout = eventCustomerCheckoutCents(path.priceCents);
        return {
          ...path,
          remaining: shouldRevealRemainingSpots(path.capacity, remaining) ? remaining : null,
          isAvailable: remaining > 0,
          serviceFeeCents: checkout.customerFeeCents,
          totalCents: checkout.totalCents,
        };
      }),
      host, attendingModels, attendingPhotographers,
      sponsors: sponsors.map((sponsor) => ({ ...sponsor, logoPath: sponsor.hasLogoUpload ? `/api/sponsors/${sponsor.id}/logo` : sponsor.logoPath })),
    } });
  } catch (error) {
    console.error("Unable to load mobile event details", error);
    return NextResponse.json({ error: "Unable to load event details." }, { status: 500 });
  }
}
