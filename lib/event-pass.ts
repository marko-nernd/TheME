import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventParticipations, events, eventTransactions } from "@/db/schema";
import { hashToken } from "@/lib/auth";
import { eventConfirmationCode } from "@/lib/confirmation-code";

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function securePassPayload(participationId: string, token: string) { return `MEPASS:${participationId}:${token}`; }
export async function getEventPass(id: string, memberId?: string, guestToken?: string) {
  if (!uuidPattern.test(id)) return null;
  const [pass] = await db.select({
    id: eventParticipations.id, memberId: eventParticipations.memberId, guestHash: eventParticipations.guestAccessTokenHash,
    token: eventParticipations.checkInToken, checkedInAt: eventParticipations.checkedInAt,
    status: eventParticipations.status, name: eventParticipations.applicantName, role: eventParticipations.pathType,
    priceCents: eventParticipations.priceCents, accommodation: eventParticipations.accommodationType,
    stayCents: eventParticipations.accommodationPriceCents,
    eventId: events.id, title: events.title, slug: events.slug, location: events.location, venue: events.venue,
    startsAt: events.startsAt, endsAt: events.endsAt, included: events.included, requirements: events.requirements,
    passportRequired: events.passportRequired, airportInfo: events.airportInfo, flightInstructions: events.flightInstructions,
    travelDetails: events.travelDetails,
    refundDaysBefore: events.refundDaysBefore, noRefunds: events.noRefunds, refundTerms: events.refundTerms,
    transactionId: eventTransactions.id, confirmationCode: eventTransactions.confirmationCode, paidAt: eventTransactions.paidAt,
    transactionStatus: eventTransactions.status, totalCents: eventTransactions.grossCents,
  }).from(eventParticipations).innerJoin(events, eq(events.id, eventParticipations.eventId))
    .leftJoin(eventTransactions, and(eq(eventTransactions.participationId, eventParticipations.id), eq(eventTransactions.status, "paid")))
    .where(eq(eventParticipations.id, id)).limit(1);
  if (!pass || !(memberId && pass.memberId === memberId || !pass.memberId && guestToken && pass.guestHash === hashToken(guestToken))) return null;
  return { ...pass, isPast: (pass.endsAt ?? pass.startsAt).getTime() < Date.now(), confirmationCode: pass.confirmationCode ?? eventConfirmationCode(pass.id), valid: pass.status === "confirmed" && (pass.priceCents === 0 || Boolean(pass.transactionId)), cutoff: new Date(pass.startsAt.getTime() - pass.refundDaysBefore * 86400000) };
}
