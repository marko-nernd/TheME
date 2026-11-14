import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventProposals, events } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { eventMediaValues } from "@/lib/event-media";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || !member.adminApprovedAt) {
    return NextResponse.json({ error: "Approved account required." }, { status: 401 });
  }
  try {
    const values = await eventMediaValues(await request.formData());
    const updated = await db.transaction(async (transaction) => {
    const [proposal] = await transaction
      .update(eventProposals)
      .set(values)
      .where(and(eq(eventProposals.id, (await params).id), eq(eventProposals.memberId, member.id)))
      .returning({ id: eventProposals.id, eventId: eventProposals.eventId });
    if (proposal?.eventId) {
      await transaction.update(events).set(values).where(and(eq(events.id, proposal.eventId), eq(events.ownerId, member.id)));
    }
    return proposal;
    });
    if (!updated) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message === "INVALID_EVENT_POSTER"
      ? "The MP4 needs a generated poster image."
      : "Upload a cropped 1920×1080 JPEG/PNG or a 16:9 looping MP4 under 5 MB.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
