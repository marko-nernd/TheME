import { eventProposals, events } from "@/db/schema";
import { defaultParticipationPaths } from "@/lib/participation";

export function publishedEventValues(proposal: typeof eventProposals.$inferSelect): typeof events.$inferInsert {
    const [startDate, endDate] = proposal.timing.split(" to ");
    const startsAt = new Date(`${startDate}T09:00:00-07:00`);
    const endsAt = new Date(`${endDate}T17:00:00-07:00`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new Error("INVALID_EVENT_DATES");
    }
    const paths = proposal.participationPaths.length
      ? proposal.participationPaths
      : defaultParticipationPaths;
    const capacity = paths
      .filter((path) => path.enabled && ["model", "photographer", "attendee"].includes(path.type))
      .reduce((sum, path) => sum + path.capacity, 0);
    const attendeePrices = paths.filter((path) => path.enabled && ["model", "photographer", "attendee"].includes(path.type)).map((path) => path.priceCents);
    const baseSlug =
      proposal.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "event";

  return {
          ownerId: proposal.memberId,
          slug: `${baseSlug}-${proposal.id.slice(0, 8)}`,
          title: proposal.title,
          category: proposal.eventType,
          location: proposal.location,
          countryCode: proposal.countryCode,
          stateCode: proposal.stateCode,
          city: proposal.city,
          introSentence: proposal.introSentence,
          summary: proposal.introSentence,
          description: proposal.fullDescription,
          startsAt,
          endsAt,
          venue: proposal.venueStatus,
          externalEventUrl: proposal.externalEventUrl,
          redirectToExternal: proposal.redirectToExternal,
          mediaType: proposal.mediaType,
          mediaData: proposal.mediaData,
          mediaMime: proposal.mediaMime,
          posterData: proposal.posterData,
          posterMime: proposal.posterMime,
          priceCents: attendeePrices.length ? Math.min(...attendeePrices) : 0,
          refundDaysBefore: proposal.refundDaysBefore,
          showRefundNote: proposal.showRefundNote,
          flightCostsExcluded: proposal.flightCostsExcluded,
          refundTerms: proposal.refundTerms,
          noRefunds: proposal.noRefunds,
          passportRequired: proposal.passportRequired,
          shootTypes: proposal.shootTypes,
          accommodationDetails: proposal.accommodationDetails,
          accommodationLinks: proposal.accommodationLinks,
          included: proposal.included,
          requirements: proposal.requirements,
          hotelAvailable: proposal.hotelAvailable,
          hotelPriceCents: proposal.hotelPriceCents,
          hotelModelsAllowed: proposal.hotelModelsAllowed,
          hotelPhotographersAllowed: proposal.hotelPhotographersAllowed,
          villaAvailable: proposal.villaAvailable,
          villaPriceCents: proposal.villaPriceCents,
          villaModelPriceCents: proposal.villaModelPriceCents,
          villaPhotographerPriceCents: proposal.villaPhotographerPriceCents,
          villaModelSpots: proposal.villaModelSpots,
          villaPhotographerSpots: proposal.villaPhotographerSpots,
          villaModelsAllowed: proposal.villaModelsAllowed,
          villaPhotographersAllowed: proposal.villaPhotographersAllowed,
          airportInfo: proposal.airportInfo,
          travelDetails: proposal.travelDetails,
          flightInstructions: proposal.flightInstructions,
          participationPaths: paths,
          capacity,
          spotsRemaining: capacity,
          isPublished: true,
  };
}
