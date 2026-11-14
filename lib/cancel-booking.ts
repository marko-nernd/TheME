import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventParticipations, events } from "@/db/schema";
import { getTestStripe } from "@/lib/host-payouts";
import { uuidPattern } from "@/lib/event-pass";

export class BookingChangeError extends Error {}

// Match checkout's lock order: event, then booking. Stop an unpaid intent before releasing a seat.
export async function cancelBooking(id: string, actorId: string, byHost: boolean, reason: string) {
  if (!uuidPattern.test(id)) throw new BookingChangeError("Booking not found.");
  return db.transaction(async (tx) => {
    const [reference] = await tx.select({ eventId: eventParticipations.eventId }).from(eventParticipations).where(eq(eventParticipations.id, id)).limit(1);
    if (!reference) throw new BookingChangeError("Booking not found.");
    const [event] = await tx.select().from(events).where(eq(events.id, reference.eventId)).for("update");
    const [booking] = await tx.select().from(eventParticipations).where(eq(eventParticipations.id, id)).for("update");
    if (!booking || (byHost ? event?.ownerId !== actorId : booking.memberId !== actorId)) throw new BookingChangeError("Booking not found.");
    const allowed = byHost ? ["pending", "approved", "awaiting_payment", "confirmed"] : ["approved", "awaiting_payment", "confirmed"];
    if (!allowed.includes(booking.status)) throw new BookingChangeError("This booking is already inactive. Refresh your event list.");
    if (booking.stripePaymentIntentId && booking.status !== "confirmed") {
      const stripe = getTestStripe();
      const payment = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
      if (payment.livemode) throw new BookingChangeError("Live billing requires administrator attention.");
      if (["processing", "succeeded"].includes(payment.status)) throw new BookingChangeError("Payment is processing or confirmation is syncing. Refresh the booking before canceling; do not pay again.");
      if (payment.status !== "canceled") await stripe.paymentIntents.cancel(payment.id, {}, { idempotencyKey: `cancel-booking-${payment.id}` });
    }
    await tx.update(eventParticipations).set({ status: "cancelled", withdrawalReason: reason, withdrawnAt: new Date(), checkInToken: randomUUID(), updatedAt: new Date() }).where(eq(eventParticipations.id, id));
    return { id };
  });
}
