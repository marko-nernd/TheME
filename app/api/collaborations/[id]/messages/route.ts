import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { collaborationMessages, collaborationRequests } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 1 || message.length > 2000) {
    return NextResponse.json({ error: "Write a message up to 2,000 characters." }, { status: 400 });
  }
  const [thread] = await db
    .select({ id: collaborationRequests.id })
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
    return NextResponse.json(
      { error: "Messages open after the request is accepted." },
      { status: 403 },
    );
  }
  const [created] = await db
    .insert(collaborationMessages)
    .values({ requestId: id, senderMemberId: member.id, body: message })
    .returning({ id: collaborationMessages.id });
  await db
    .update(collaborationRequests)
    .set({ updatedAt: new Date() })
    .where(eq(collaborationRequests.id, id));
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
