import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { events, eventParticipations, eventTransactions, memberNotifications, travelEmailOutbox } from "@/db/schema";
import { travelFingerprint } from "@/lib/event-travel-fields";

export async function updateEventWithTravel(eventId: string, values: Partial<typeof events.$inferInsert>, ownerId?: string) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(events).where(and(eq(events.id, eventId), ownerId ? eq(events.ownerId, ownerId) : undefined)).for("update");
    if (!before) return null;
    const after = { ...before, ...values };
    await tx.update(events).set({ ...values, updatedAt: new Date() }).where(eq(events.id, eventId));
    if (travelFingerprint(before) !== travelFingerprint(after)) {
      const recipients = await tx.selectDistinct({ memberId: eventParticipations.memberId, email: eventParticipations.applicantEmail })
        .from(eventParticipations).innerJoin(eventTransactions, eq(eventTransactions.participationId, eventParticipations.id))
        .where(and(eq(eventParticipations.eventId, eventId), eq(eventParticipations.status, "confirmed"), eq(eventTransactions.status, "paid"), gt(eventTransactions.grossCents, 0)));
      for (const person of recipients) {
        if (person.memberId) await tx.insert(memberNotifications).values({ memberId: person.memberId, type: "event_travel_updated", title: "Flying instructions updated", message: `The host updated travel details for ${after.title}. Review the latest instructions before traveling.`, href: `/events/${after.slug}#travel`, resourceId: eventId });
        await tx.insert(travelEmailOutbox).values({ eventId, memberId: person.memberId, email: person.email, title: after.title, slug: after.slug });
      }
    }
    return before;
  });
}
