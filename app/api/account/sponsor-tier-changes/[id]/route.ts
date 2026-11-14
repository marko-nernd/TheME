import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, sponsors, sponsorTierChangeRequests } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member || member.primaryRole !== "sponsor") return NextResponse.json({ error: "Sponsor account required." }, { status: 401 });
  const action = String((await request.json()).action ?? "");
  if (!["accept", "decline"].includes(action)) return NextResponse.json({ error: "Choose accept or decline." }, { status: 400 });
  const { id } = await params;
  const [change] = await db.select().from(sponsorTierChangeRequests)
    .where(and(eq(sponsorTierChangeRequests.id, id), eq(sponsorTierChangeRequests.memberId, member.id), eq(sponsorTierChangeRequests.status, "pending"))).limit(1);
  if (!change) return NextResponse.json({ error: "Tier change not found." }, { status: 404 });
  await db.transaction(async (transaction) => {
    await transaction.update(sponsorTierChangeRequests).set({ status: action === "accept" ? "accepted" : "declined", respondedAt: new Date() }).where(eq(sponsorTierChangeRequests.id, id));
    if (action === "accept") {
      await transaction.update(sponsors).set({ sponsorLevel: change.requestedLevel, updatedAt: new Date() }).where(eq(sponsors.id, change.sponsorId));
      await transaction.update(members).set({ membershipTierOverride: `sponsor_${change.requestedLevel.toLowerCase()}`, updatedAt: new Date() }).where(eq(members.id, member.id));
    }
  });
  return NextResponse.json({ ok: true });
}
