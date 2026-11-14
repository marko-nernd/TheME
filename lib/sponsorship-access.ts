import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, sponsorMembers, sponsorshipRequests } from "@/db/schema";

export async function getAuthorizedSponsorshipRequest(requestId: string, memberId: string) {
  const [record] = await db.select({
    id: sponsorshipRequests.id,
    eventId: sponsorshipRequests.eventId,
    sponsorId: sponsorshipRequests.sponsorId,
    requesterMemberId: sponsorshipRequests.requesterMemberId,
    targetMemberId: sponsorshipRequests.targetMemberId,
    eventOwnerId: events.ownerId,
    direction: sponsorshipRequests.direction,
    status: sponsorshipRequests.status,
    responseMemberId: sponsorshipRequests.responseMemberId,
  }).from(sponsorshipRequests).innerJoin(events, eq(events.id, sponsorshipRequests.eventId)).where(eq(sponsorshipRequests.id, requestId)).limit(1);
  if (!record) return null;
  const sponsorAccess = await db.select({ memberId: sponsorMembers.memberId }).from(sponsorMembers).where(eq(sponsorMembers.sponsorId, record.sponsorId));
  const participants = new Set([record.requesterMemberId, record.targetMemberId, record.eventOwnerId, ...sponsorAccess.map((item) => item.memberId)].filter(Boolean));
  return participants.has(memberId) ? record : null;
}
