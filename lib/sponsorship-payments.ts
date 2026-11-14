import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventSponsors, sponsorshipAgreements, sponsorshipRequests } from "@/db/schema";

export async function finalizeSponsorshipPayment(paymentIntent: Stripe.PaymentIntent) {
  if (paymentIntent.metadata.kind !== "sponsorship_agreement" || !paymentIntent.metadata.agreementId) return false;
  await db.transaction(async (transaction) => {
    const [record] = await transaction.select({ id: sponsorshipAgreements.id, inKindStatus: sponsorshipAgreements.inKindStatus, requestId: sponsorshipAgreements.requestId }).from(sponsorshipAgreements).where(eq(sponsorshipAgreements.id, paymentIntent.metadata.agreementId)).limit(1);
    if (!record) throw new Error("Sponsorship agreement not found.");
    const completed = ["not_required", "confirmed"].includes(record.inKindStatus);
    await transaction.update(sponsorshipAgreements).set({ paymentStatus: "paid", status: completed ? "completed" : "confirmed", completedAt: completed ? new Date() : null, updatedAt: new Date() }).where(eq(sponsorshipAgreements.id, record.id));
    if (completed) {
      const [request] = await transaction.select({ eventId: sponsorshipRequests.eventId, sponsorId: sponsorshipRequests.sponsorId }).from(sponsorshipRequests).where(eq(sponsorshipRequests.id, record.requestId)).limit(1);
      if (request) await transaction.update(eventSponsors).set({ level: "Active sponsor", contribution: "Agreement accepted and sponsorship fulfilled." }).where(and(eq(eventSponsors.eventId, request.eventId), eq(eventSponsors.sponsorId, request.sponsorId)));
    }
  });
  return true;
}

export async function completeSponsorshipIfReady(agreementId: string) {
  await db.transaction(async (transaction) => {
    const [agreement] = await transaction.select({ requestId: sponsorshipAgreements.requestId, status: sponsorshipAgreements.status, paymentStatus: sponsorshipAgreements.paymentStatus, inKindStatus: sponsorshipAgreements.inKindStatus }).from(sponsorshipAgreements).where(eq(sponsorshipAgreements.id, agreementId)).limit(1);
    if (!agreement || !["confirmed", "completed"].includes(agreement.status)) return;
    if (!["not_required", "paid"].includes(agreement.paymentStatus) || !["not_required", "confirmed"].includes(agreement.inKindStatus)) return;
    await transaction.update(sponsorshipAgreements).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(eq(sponsorshipAgreements.id, agreementId));
    const [request] = await transaction.select({ eventId: sponsorshipRequests.eventId, sponsorId: sponsorshipRequests.sponsorId }).from(sponsorshipRequests).where(eq(sponsorshipRequests.id, agreement.requestId)).limit(1);
    if (request) await transaction.update(eventSponsors).set({ level: "Active sponsor", contribution: "Agreement accepted and sponsorship fulfilled." }).where(and(eq(eventSponsors.eventId, request.eventId), eq(eventSponsors.sponsorId, request.sponsorId)));
  });
}
