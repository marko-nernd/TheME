import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { collaborationRequests, events, members, profileContactAudits } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const recipientMemberId =
      typeof body.recipientMemberId === "string" ? body.recipientMemberId : "";
    const eventId = typeof body.eventId === "string" && body.eventId ? body.eventId : null;
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (subject.length < 4 || subject.length > 120 || message.length < 20 || message.length > 2000) {
      return NextResponse.json(
        { error: "Use a 4–120 character subject and a 20–2,000 character message." },
        { status: 400 },
      );
    }
    const [recipient] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.id, recipientMemberId), ne(members.id, member.id)))
      .limit(1);
    if (!recipient) {
      return NextResponse.json({ error: "Choose another member." }, { status: 400 });
    }
    if (eventId) {
      const [event] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.id, eventId), eq(events.ownerId, member.id)))
        .limit(1);
      if (!event) return NextResponse.json({ error: "Choose a valid event." }, { status: 400 });
    }
    const record = await db.transaction(async (transaction) => {
      if (eventId) {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`${member.id}:${recipientMemberId}:${eventId}`}))`,
        );
        const [recentInvite] = await transaction
          .select({
            retryAt: sql<Date>`${collaborationRequests.createdAt} + interval '12 hours'`,
          })
          .from(collaborationRequests)
          .where(
            and(
              eq(collaborationRequests.senderMemberId, member.id),
              eq(collaborationRequests.recipientMemberId, recipientMemberId),
              eq(collaborationRequests.eventId, eventId),
              eq(collaborationRequests.kind, "event_invite"),
              sql`${collaborationRequests.createdAt} > now() - interval '12 hours'`,
            ),
          )
          .limit(1);
        if (recentInvite) {
          return { cooldown: recentInvite.retryAt };
        }
      }
      const [created] = await transaction
        .insert(collaborationRequests)
        .values({
          senderMemberId: member.id,
          recipientMemberId,
          eventId,
          kind: eventId ? "event_invite" : "introduction",
          subject,
          message,
        })
        .returning({ id: collaborationRequests.id });
      await transaction.insert(profileContactAudits).values({
        viewerMemberId: member.id,
        targetMemberId: recipientMemberId,
        action: eventId ? "event_invite_sent" : "introduction_sent",
        contextId: created.id,
      });
      return { id: created.id };
    });
    if ("cooldown" in record) {
      return NextResponse.json(
        {
          error: "This invitation was already sent. You can send it again after the 12-hour cooldown.",
          retryAt: record.cooldown,
        },
        { status: 429 },
      );
    }
    return NextResponse.json({ ok: true, id: record.id }, { status: 201 });
  } catch (error) {
    console.error("Collaboration request failed", error);
    return NextResponse.json({ error: "Could not send the request." }, { status: 500 });
  }
}
