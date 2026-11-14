import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sponsorMembers, sponsors, sponsorTierChangeRequests } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

const levels = ["Silver", "Gold", "Platinum", "Diamond"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const requestedLevel = String((await request.json()).level ?? "");
  if (!levels.includes(requestedLevel)) return NextResponse.json({ error: "Choose a valid sponsor level." }, { status: 400 });
  const { id } = await params;
  const [record] = await db.select({ sponsorId: sponsors.id, memberId: sponsorMembers.memberId, currentLevel: sponsors.sponsorLevel })
    .from(sponsors).innerJoin(sponsorMembers, eq(sponsorMembers.sponsorId, sponsors.id)).where(eq(sponsors.id, id)).limit(1);
  if (!record) return NextResponse.json({ error: "Sponsor account not found." }, { status: 404 });
  if (record.currentLevel === requestedLevel) return NextResponse.json({ error: `This sponsor is already ${requestedLevel}.` }, { status: 409 });
  await db.transaction(async (transaction) => {
    await transaction.update(sponsorTierChangeRequests).set({ status: "superseded", respondedAt: new Date() })
      .where(and(eq(sponsorTierChangeRequests.sponsorId, id), eq(sponsorTierChangeRequests.status, "pending")));
    await transaction.insert(sponsorTierChangeRequests).values({
      sponsorId: id, memberId: record.memberId, previousLevel: record.currentLevel, requestedLevel,
    });
  });
  return NextResponse.json({ ok: true });
}
