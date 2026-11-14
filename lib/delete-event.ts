import { rm } from "node:fs/promises";
import path from "node:path";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { collaborationRequests, eventDeletionLogs, eventProposals, events } from "@/db/schema";

export async function deleteEventRecord(eventId: string, actor: { type: "admin" | "owner"; id?: string } = { type: "admin" }) {
  const deleted = await db.transaction(async (transaction) => {
    const [existing] = await transaction.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!existing) return null;
    const { mediaData: _mediaData, posterData: _posterData, ...eventSnapshot } = existing;
    const proposalMatch = existing.ownerId
      ? or(eq(eventProposals.eventId, eventId), and(eq(eventProposals.status, "approved"), eq(eventProposals.memberId, existing.ownerId), eq(eventProposals.title, existing.title)))
      : eq(eventProposals.eventId, eventId);
    const [proposal] = await transaction.select({ id: eventProposals.id }).from(eventProposals).where(proposalMatch).limit(1);
    await transaction.insert(eventDeletionLogs).values({
      eventId,
      proposalId: proposal?.id,
      ownerId: existing.ownerId,
      title: existing.title,
      slug: existing.slug,
      actorType: actor.type,
      actorId: actor.id,
      snapshot: eventSnapshot as unknown as Record<string, unknown>,
    });
    if (proposal) {
      await transaction.update(eventProposals).set({ status: "deleted", eventId: null, updatedAt: new Date() }).where(eq(eventProposals.id, proposal.id));
    }
    await transaction
      .delete(collaborationRequests)
      .where(eq(collaborationRequests.eventId, eventId));
    const [event] = await transaction
      .delete(events)
      .where(eq(events.id, eventId))
      .returning({ id: events.id, title: events.title });
    return event ?? null;
  });

  if (!deleted) return null;

  // Current seeded artwork is shared source material and must remain intact.
  // Event-owned uploads use this isolated directory and are removed with the event.
  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads", "events");
  const eventUploads = path.resolve(uploadsRoot, eventId);
  if (eventUploads.startsWith(`${uploadsRoot}${path.sep}`)) {
    await rm(eventUploads, { recursive: true, force: true });
  }
  return deleted;
}
