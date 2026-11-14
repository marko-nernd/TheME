import { shootTypeOptions } from "@/lib/shoot-types";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventProposals, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { publishedEventValues } from "@/lib/publish-event";
import { eventTypeValues } from "@/lib/event-types";
import { resolveStructuredLocation } from "@/lib/locations";
import { parseParticipationPaths } from "@/lib/participation";
import { getCurrentMember } from "@/lib/auth";
import { assertEventCapacity } from "@/lib/entitlements";
import { parseExternalEventDestination } from "@/lib/event-destination";
import { isHostRole } from "@/lib/roles";
import { parseEventTravel } from "@/lib/event-travel-fields";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const required = ["title", "eventType", "timing", "venueStatus", "fundingSource", "introSentence", "fullDescription"];
    const member = await getCurrentMember();
    if (!member?.emailVerifiedAt || !member.adminApprovedAt) {
      return NextResponse.json({ error: "Sign in with an approved account to create an event." }, { status: 401 });
    }
    if (!isHostRole(member.primaryRole)) {
      return NextResponse.json({ error: "Only hosts can create events." }, { status: 403 });
    }
    const location = resolveStructuredLocation(body);
    const refundDaysBefore = Number(body.refundDaysBefore ?? 45);
    const refundTerms =
      typeof body.refundTerms === "string" ? body.refundTerms.trim() : "";
    const participationPaths = parseParticipationPaths(body.participationPaths);
    const allowedShootTypes = new Set(shootTypeOptions);
    const shootTypes = Array.isArray(body.shootTypes)
      ? body.shootTypes.filter((value: unknown): value is string => typeof value === "string" && allowedShootTypes.has(value))
      : [];
    const noRefunds = body.noRefunds === true;
    const passportRequired = body.eventType === "Destination photoshoot" && body.passportRequired === true;
    const destination = { ...parseExternalEventDestination(body), travelDetails: parseEventTravel(body.travelDetails) };
    const listItems = (value: unknown) =>
      typeof value === "string"
        ? value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 30)
        : [];
    const included = listItems(body.included);
    const accommodationDetails = listItems(body.accommodationDetails);
    const requirements = listItems(body.requirements);
    const hotelAvailable = body.hotelAvailable === true;
    const villaAvailable = body.villaAvailable === true;
    const hotelModelsAllowed = body.hotelModelsAllowed !== false;
    const hotelPhotographersAllowed = body.hotelPhotographersAllowed === true;
    const villaModelsAllowed = body.villaModelsAllowed !== false;
    const villaPhotographersAllowed = body.villaPhotographersAllowed === true;
    const hotelPriceCents = Math.max(0, Math.round(Number(body.hotelPriceDollars || 0) * 100));
    const villaModelPriceCents = Math.max(0, Math.round(Number(body.villaModelPriceDollars || 0) * 100));
    const villaPhotographerPriceCents = Math.max(0, Math.round(Number(body.villaPhotographerPriceDollars || 0) * 100));
    const offeredVillaPrices = [villaModelsAllowed && villaModelPriceCents, villaPhotographersAllowed && villaPhotographerPriceCents].filter((price): price is number => typeof price === "number" && price > 0);
    const villaPriceCents = offeredVillaPrices.length ? Math.min(...offeredVillaPrices) : 0;
    const villaModelSpots = Math.max(0, Math.floor(Number(body.villaModelSpots || 0)));
    const villaPhotographerSpots = Math.max(0, Math.floor(Number(body.villaPhotographerSpots || 0)));
    const expectedAttendance = participationPaths.filter((path) => path.enabled && ["model", "photographer", "attendee"].includes(path.type)).reduce((total, path) => total + path.capacity, 0);
    const airportInfo = typeof body.airportInfo === "string" ? body.airportInfo.trim().slice(0, 1200) : "";
    const flightInstructions = typeof body.flightInstructions === "string" ? body.flightInstructions.trim().slice(0, 1800) : "";
    const missing: string[] = [];
    for (const key of required) {
      if (typeof body[key] !== "string" || !body[key].trim()) {
        const step = ["fundingSource"].includes(key) ? "Step 2 — Attendance and funding" : "Step 1 — Event details";
        missing.push(`${step}: ${key.replaceAll(/([A-Z])/g, " $1").toLowerCase()}`);
      }
    }
    if (!eventTypeValues.has(String(body.eventType).trim())) missing.push("Step 1 — Event details: choose an event type from the list");
    if (!location) missing.push("Step 1 — Event details: choose an exact city or destination");
    const introWords = typeof body.introSentence === "string" ? body.introSentence.trim().split(/\s+/).filter(Boolean).length : 0;
    if (introWords < 1 || introWords > 8) missing.push("Step 1 — Event details: intro sentence must contain no more than 8 words");
    if (typeof body.fullDescription !== "string" || body.fullDescription.trim().length < 80 || body.fullDescription.trim().length > 5000) missing.push("Step 1 — Event details: full description must contain between 80 and 5,000 characters");
    if (typeof body.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) missing.push("Step 1 — Event details: enter a valid start date");
    if (typeof body.endDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) missing.push("Step 1 — Event details: enter a valid end date");
    if (typeof body.startDate === "string" && typeof body.endDate === "string" && body.endDate < body.startDate) {
      return NextResponse.json({ error: "Step 1 — Event details: start date must be before or the same day as the end date." }, { status: 400 });
    }
    if (!noRefunds && (!Number.isInteger(refundDaysBefore) || refundDaysBefore < 0 || refundDaysBefore > 365)) missing.push("Step 3 — Participation and refunds: enter a refund cutoff between 0 and 365 days, or select No refunds");
    if (refundTerms.length > 1000) missing.push("Step 3 — Participation and refunds: keep refund terms under 1,000 characters");
    if (shootTypes.length < 1) missing.push("Step 1 — Event details: select at least one shoot type");
    if (participationPaths.some((path) => !["model", "photographer", "sponsor", "attendee"].includes(path.type))) missing.push("Step 3 — Participation and refunds: remove the unsupported participation option");
    if (!participationPaths.some((path) => path.enabled)) missing.push("Step 3 — Participation and refunds: enable at least one of General attendee, Model, Photographer, or Sponsor");
    if (hotelAvailable && hotelPriceCents < 100) missing.push("Step 3 — Participation and refunds: enter the additional hotel charge");
    if (hotelAvailable && !hotelModelsAllowed && !hotelPhotographersAllowed) missing.push("Step 3 — Participation and refunds: allow models and/or photographers to add the hotel fee");
    if (villaAvailable && villaModelsAllowed && (villaModelSpots < 1 || villaModelPriceCents < 100)) missing.push("Step 3 — Participation and refunds: enter villa spaces and a charge for models");
    if (villaAvailable && villaPhotographersAllowed && (villaPhotographerSpots < 1 || villaPhotographerPriceCents < 100)) missing.push("Step 3 — Participation and refunds: enter villa spaces and a charge for photographers");
    if (villaAvailable && !villaModelsAllowed && !villaPhotographersAllowed) missing.push("Step 3 — Participation and refunds: allow models and/or photographers to add the villa fee");
    if (passportRequired && !airportInfo && !destination.travelDetails.airportName) missing.push("Step 5 — Review and confirm: add airport information");
    if (passportRequired && !flightInstructions) missing.push("Step 5 — Review and confirm: add flying instructions");
    if (missing.length) {
      return NextResponse.json({ error: `Complete the following: ${[...new Set(missing)].join(", ")}.` }, { status: 400 });
    }
    if (!location) {
      return NextResponse.json({ error: "Complete the following: Step 1 — Event details: choose an exact city or destination." }, { status: 400 });
    }
    if (isHostRole(member.primaryRole)) {
      const capacity = await assertEventCapacity(member.id);
      if (!capacity.ok) return NextResponse.json({ error: capacity.error }, { status: 403 });
    }
    const result = await db.transaction(async (transaction) => {
    const [proposal] = await transaction.insert(eventProposals).values({ memberId: member.id, role: member.primaryRole, contactName: member.name, contactEmail: member.email, organization: member.organization, title: body.title.trim(), eventType: body.eventType.trim(), location: location.label, countryCode: location.countryCode, stateCode: location.stateCode, city: location.city, timing: body.timing.trim(), venueStatus: body.venueStatus.trim(), ...destination, expectedAttendance, budgetBand: "Not collected", fundingSource: body.fundingSource.trim(), supportNeeded: Array.isArray(body.supportNeeded) ? body.supportNeeded.filter((value: unknown) => typeof value === "string").slice(0, 12) : [], refundDaysBefore: noRefunds ? 45 : refundDaysBefore, showRefundNote: body.showRefundNote !== false, flightCostsExcluded: body.flightCostsExcluded !== false, refundTerms, noRefunds, passportRequired, shootTypes, included, accommodationDetails, requirements, hotelAvailable, hotelPriceCents, hotelModelsAllowed, hotelPhotographersAllowed, villaAvailable, villaPriceCents, villaModelPriceCents, villaPhotographerPriceCents, villaModelSpots, villaPhotographerSpots, villaModelsAllowed, villaPhotographersAllowed, airportInfo, flightInstructions, participationPaths, introSentence: body.introSentence.trim(), fullDescription: body.fullDescription.trim() }).returning();
      if (!isHostRole(member.primaryRole)) return { id: proposal.id, status: proposal.status };
      const [event] = await transaction.insert(events).values(publishedEventValues({
        ...proposal, timing: `${body.startDate} to ${body.endDate}`,
      })).returning({ id: events.id, slug: events.slug });
      await transaction.update(eventProposals).set({
        status: "approved", eventId: event.id, rejectionReason: "", updatedAt: new Date(),
      }).where(eq(eventProposals.id, proposal.id));
      return { id: proposal.id, status: "approved", event };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TRAVEL") return NextResponse.json({ error: "Step 5 — Flying instructions: use a three-letter airport code and a valid IANA timezone, and check field lengths." }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_EXTERNAL_EVENT_URL") {
      return NextResponse.json({ error: "Enter a complete http(s) event website before enabling external redirect." }, { status: 400 });
    }
    console.error("Proposal submission failed", error);
    return NextResponse.json({ error: "The local database is unavailable. Start Docker and try again." }, { status: 503 });
  }
}
