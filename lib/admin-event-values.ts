import { parseAccommodationOptions } from "@/lib/accommodation-options";
import { eventTypeValues } from "@/lib/event-types";
import { resolveStructuredLocation } from "@/lib/locations";
import { parseParticipationPaths } from "@/lib/participation";
import { parseExternalEventDestination } from "@/lib/event-destination";
import { parseEventTravel } from "@/lib/event-travel-fields";

export function eventValues(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const location = resolveStructuredLocation(body);
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const startsAt = new Date(String(body.startsAt ?? ""));
  const endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
  const capacity = Number(body.capacity);
  const spotsRemaining = Number(body.spotsRemaining);
  const costDollars = Number(body.costDollars);
  const refundDaysBefore = Number(body.refundDaysBefore ?? 45);
  const refundTerms =
    typeof body.refundTerms === "string" ? body.refundTerms.trim() : "";
  const participationPaths = parseParticipationPaths(body.participationPaths);
  const destination = parseExternalEventDestination(body);
  const hotelAvailable = body.hotelAvailable === true;
  const hotelPriceCents = Math.max(0, Math.round(Number(body.hotelPriceDollars || 0) * 100));
  const hotelModelsAllowed = body.hotelModelsAllowed !== false;
  const hotelPhotographersAllowed = body.hotelPhotographersAllowed === true;
  const villaAvailable = body.villaAvailable === true;
  const villaModelPriceCents = Math.max(0, Math.round(Number(body.villaModelPriceDollars || 0) * 100));
  const villaPhotographerPriceCents = Math.max(0, Math.round(Number(body.villaPhotographerPriceDollars || 0) * 100));
  const villaModelSpots = Math.max(0, Math.floor(Number(body.villaModelSpots || 0)));
  const villaPhotographerSpots = Math.max(0, Math.floor(Number(body.villaPhotographerSpots || 0)));
  const villaModelsAllowed = body.villaModelsAllowed !== false;
  const villaPhotographersAllowed = body.villaPhotographersAllowed === true;
  const offeredVillaPrices = [villaModelsAllowed && villaModelPriceCents, villaPhotographersAllowed && villaPhotographerPriceCents].filter((price): price is number => typeof price === "number" && price > 0);
  if (!title || !eventTypeValues.has(category) || !location || !summary || Number.isNaN(startsAt.getTime()) || !Number.isInteger(capacity) || capacity < 1 || !Number.isInteger(spotsRemaining) || spotsRemaining < 0 || spotsRemaining > capacity || !Number.isFinite(costDollars) || costDollars < 0 || !Number.isInteger(refundDaysBefore) || refundDaysBefore < 0 || refundDaysBefore > 365 || refundTerms.length > 1000 || !participationPaths.some((path) => path.enabled) || (hotelAvailable && (hotelPriceCents < 100 || (!hotelModelsAllowed && !hotelPhotographersAllowed))) || (villaAvailable && ((!villaModelsAllowed && !villaPhotographersAllowed) || (villaModelsAllowed && (villaModelPriceCents < 100 || villaModelSpots < 1)) || (villaPhotographersAllowed && (villaPhotographerPriceCents < 100 || villaPhotographerSpots < 1))))) {
    throw new Error("INVALID_EVENT");
  }
  return {
    title,
    category,
    location: location.label,
    countryCode: location.countryCode,
    stateCode: location.stateCode,
    city: location.city,
    summary,
    description: typeof body.description === "string" ? body.description.trim() : "",
    imagePath: typeof body.imagePath === "string" && body.imagePath.trim() ? body.imagePath.trim() : "/images/desert-production.png",
    startsAt,
    endsAt: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null,
    venue: typeof body.venue === "string" && body.venue.trim() ? body.venue.trim() : null,
    ...destination,
    priceCents: Math.round(costDollars * 100),
    refundDaysBefore,
    ...(typeof body.showRefundNote === "boolean" ? { showRefundNote: body.showRefundNote } : {}),
    ...(typeof body.flightCostsExcluded === "boolean" ? { flightCostsExcluded: body.flightCostsExcluded } : {}),
    refundTerms,
    noRefunds: body.noRefunds === true,
    passportRequired: body.passportRequired === true,
    ...(Object.hasOwn(body, "travelDetails") ? { travelDetails: parseEventTravel(body.travelDetails) } : {}),
    ...(typeof body.airportInfo === "string" ? { airportInfo: body.airportInfo.trim().slice(0, 1200) } : {}),
    ...(typeof body.flightInstructions === "string" ? { flightInstructions: body.flightInstructions.trim().slice(0, 1800) } : {}),
    shootTypes: Array.isArray(body.shootTypes)
      ? body.shootTypes.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, 30)
      : [],
    participationPaths,
    ...(Object.hasOwn(body, "accommodationOptions") ? parseAccommodationOptions(body.accommodationOptions) : {}),
    ...(Array.isArray(body.accommodationDetails) ? { accommodationDetails: body.accommodationDetails.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().slice(0, 1000)).slice(0, 30) } : {}),
    included: Array.isArray(body.included) ? body.included.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [],
    ...(Array.isArray(body.requirements) ? { requirements: body.requirements.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) } : {}),
    hotelAvailable,
    hotelPriceCents,
    hotelModelsAllowed,
    hotelPhotographersAllowed,
    villaAvailable,
    villaPriceCents: offeredVillaPrices.length ? Math.min(...offeredVillaPrices) : 0,
    villaModelPriceCents,
    villaPhotographerPriceCents,
    villaModelSpots,
    villaPhotographerSpots,
    villaModelsAllowed,
    villaPhotographersAllowed,
    capacity,
    spotsRemaining,
    isFeatured: body.isFeatured === true,
    isPublished: body.isPublished !== false,
    updatedAt: new Date(),
  };
}
