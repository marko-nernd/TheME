import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sponsorshipRequestMessages } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getAuthorizedSponsorshipRequest } from "@/lib/sponsorship-access";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember(); const { id } = await params;
  if (!member || !(await getAuthorizedSponsorshipRequest(id, member.id))) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const messages = await db.select().from(sponsorshipRequestMessages).where(eq(sponsorshipRequestMessages.requestId, id)).orderBy(asc(sponsorshipRequestMessages.createdAt));
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember(); const { id } = await params;
  if (!member || !(await getAuthorizedSponsorshipRequest(id, member.id))) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const body = await request.json(); const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (message.length < 2) return NextResponse.json({ error: "Enter a message." }, { status: 400 });
  const [created] = await db.insert(sponsorshipRequestMessages).values({ requestId: id, senderMemberId: member.id, senderName: member.name, body: message }).returning();
  return NextResponse.json({ message: created }, { status: 201 });
}
