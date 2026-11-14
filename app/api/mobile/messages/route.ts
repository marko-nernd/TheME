import { NextResponse } from "next/server";
import {
  getCollaborationInbox,
  getCollaborationMessagesForMember,
  getCollaborationOutbox,
} from "@/db/queries";
import { getCurrentMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const [inbox, outbox, replies] = await Promise.all([
    getCollaborationInbox(member.id),
    getCollaborationOutbox(member.id),
    getCollaborationMessagesForMember(member.id),
  ]);
  const replyGroups = new Map<string, typeof replies>();
  for (const reply of replies) {
    const group = replyGroups.get(reply.requestId) ?? [];
    group.push(reply);
    replyGroups.set(reply.requestId, group);
  }

  const incomingThreads = inbox
    .filter((thread) => thread.status === "accepted")
    .map((thread) => ({
      id: thread.id,
      participantName: thread.senderName,
      participantRole: thread.senderRole,
      subject: thread.subject,
      eventTitle: thread.eventTitle,
      updatedAt: thread.updatedAt,
      initialSenderName: thread.senderName,
      initialMessage: thread.message,
      createdAt: thread.createdAt,
    }));
  const outgoingThreads = outbox
    .filter((thread) => thread.status === "accepted")
    .map((thread) => ({
      id: thread.id,
      participantName: thread.recipientName,
      participantRole: thread.recipientRole,
      subject: thread.subject,
      eventTitle: thread.eventTitle,
      updatedAt: thread.updatedAt,
      initialSenderName: member.name,
      initialMessage: thread.message,
      createdAt: thread.createdAt,
    }));

  const threads = [...incomingThreads, ...outgoingThreads]
    .map((thread) => ({
      id: thread.id,
      participantName: thread.participantName,
      participantRole: thread.participantRole,
      subject: thread.subject,
      eventTitle: thread.eventTitle,
      updatedAt: thread.updatedAt.toISOString(),
      messages: [
        {
          id: `initial-${thread.id}`,
          senderName: thread.initialSenderName,
          body: thread.initialMessage,
          createdAt: thread.createdAt.toISOString(),
        },
        ...(replyGroups.get(thread.id) ?? []).map((reply) => ({
          id: reply.id,
          senderName: reply.senderName,
          body: reply.body,
          createdAt: reply.createdAt.toISOString(),
        })),
      ],
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return NextResponse.json(
    { threads },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
