import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { collaborationRequests, eventParticipations, members } from "@/db/schema";
import { events } from "@/db/schema";
import { defaultParticipationPaths } from "@/lib/participation";
import { getCurrentMember } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  if (body.action === "restore") {
    const [restored] = await db
      .update(collaborationRequests)
      .set({ senderHiddenAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(collaborationRequests.id, id),
          eq(collaborationRequests.senderMemberId, member.id),
          eq(collaborationRequests.status, "declined"),
          sql`${collaborationRequests.senderHiddenAt} > now() - interval '30 days'`,
        ),
      )
      .returning({ id: collaborationRequests.id });
    if (!restored) return NextResponse.json({ error: "Deleted request not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const status = body.action === "accept" ? "accepted" : body.action === "decline" ? "declined" : "";
  if (!status) return NextResponse.json({ error: "Choose accept or decline." }, { status: 400 });
  const [updated] = await db.transaction(async (transaction) => {
    const records = await transaction
      .update(collaborationRequests)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(collaborationRequests.id, id),
          eq(collaborationRequests.recipientMemberId, member.id),
          eq(collaborationRequests.status, "pending"),
        ),
      )
      .returning({
        id: collaborationRequests.id,
        eventId: collaborationRequests.eventId,
        kind: collaborationRequests.kind,
      });
    const record = records[0];
    if (record && status === "accepted" && record.kind === "event_invite" && record.eventId) {
      const [recipient] = await transaction
        .select({
          name: members.name,
          email: members.email,
          role: members.primaryRole,
          participationPaths: events.participationPaths,
        })
        .from(members)
        .innerJoin(events, eq(events.id, record.eventId))
        .where(eq(members.id, member.id))
        .limit(1);
      if (recipient) {
        const pathType = recipient.role === "model" || recipient.role === "photographer" ? recipient.role : "attendee";
        const paths = recipient.participationPaths.length
          ? recipient.participationPaths
          : defaultParticipationPaths;
        const path = paths.find((candidate) => candidate.enabled && candidate.type === pathType);
        const priceCents = path?.priceCents ?? 0;
        await transaction
          .insert(eventParticipations)
          .values({
            eventId: record.eventId,
            memberId: member.id,
            pathType,
            status: priceCents > 0 ? "approved" : "confirmed",
            applicantName: recipient.name,
            applicantEmail: recipient.email,
            note: "Accepted a direct event invitation.",
            priceCents,
          })
          .onConflictDoUpdate({
            target: [
              eventParticipations.eventId,
              eventParticipations.memberId,
            ],
            set: {
              pathType,
              status: priceCents > 0 ? "approved" : "confirmed",
              priceCents,
              withdrawalReason: null,
              withdrawnAt: null,
              updatedAt: new Date(),
            },
          });
      }
    }
    return records;
  });
  if (!updated) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const { id } = await params;
  const [deleted] = await db
    .update(collaborationRequests)
    .set({ senderHiddenAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(collaborationRequests.id, id),
        eq(collaborationRequests.senderMemberId, member.id),
        eq(collaborationRequests.status, "declined"),
      ),
    )
    .returning({ id: collaborationRequests.id });
  if (!deleted) {
    return NextResponse.json(
      { error: "Only declined requests can be removed from Sent requests." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
