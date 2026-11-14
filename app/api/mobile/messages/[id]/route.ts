import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { collaborationRequests } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const { id } = await params;
  const [thread] = await db
    .select({
      id: collaborationRequests.id,
      senderMemberId: collaborationRequests.senderMemberId,
      recipientMemberId: collaborationRequests.recipientMemberId,
    })
    .from(collaborationRequests)
    .where(
      and(
        eq(collaborationRequests.id, id),
        eq(collaborationRequests.status, "accepted"),
        or(
          eq(collaborationRequests.senderMemberId, member.id),
          eq(collaborationRequests.recipientMemberId, member.id),
        ),
      ),
    )
    .limit(1);
  if (!thread) {
    return NextResponse.json({ error: "Message thread not found." }, { status: 404 });
  }

  await db
    .update(collaborationRequests)
    .set(
      thread.senderMemberId === member.id
        ? { senderHiddenAt: new Date(), updatedAt: new Date() }
        : { recipientHiddenAt: new Date(), updatedAt: new Date() },
    )
    .where(eq(collaborationRequests.id, thread.id));

  return NextResponse.json({ ok: true });
}
