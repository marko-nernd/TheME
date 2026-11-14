import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sponsorMembers, sponsors } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

export const runtime = "nodejs";
const accepted = new Set(["image/png", "image/jpeg", "image/svg+xml"]);
const maxBytes = 15 * 1024 * 1024;

async function sponsorFor(memberId: string) {
  const [row] = await db.select({ id: sponsors.id }).from(sponsorMembers).innerJoin(sponsors, eq(sponsors.id, sponsorMembers.sponsorId)).where(eq(sponsorMembers.memberId, memberId)).limit(1);
  return row;
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member || member.primaryRole !== "sponsor") return NextResponse.json({ error: "Sponsor account required." }, { status: 401 });
  const file = (await request.formData()).get("logo");
  if (!(file instanceof File) || !accepted.has(file.type) || file.size < 1 || file.size > maxBytes) {
    return NextResponse.json({ error: "Upload a PNG, JPG, or SVG no larger than 15 MB." }, { status: 400 });
  }
  const record = await sponsorFor(member.id);
  if (!record) return NextResponse.json({ error: "Sponsor profile not found." }, { status: 404 });
  await db.update(sponsors).set({ logoData: Buffer.from(await file.arrayBuffer()), logoMime: file.type, logoFilename: file.name.slice(0, 180), updatedAt: new Date() }).where(eq(sponsors.id, record.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const member = await getCurrentMember();
  if (!member || member.primaryRole !== "sponsor") return NextResponse.json({ error: "Sponsor account required." }, { status: 401 });
  const record = await sponsorFor(member.id);
  if (!record) return NextResponse.json({ error: "Sponsor profile not found." }, { status: 404 });
  await db.update(sponsors).set({ logoData: null, logoMime: null, logoFilename: null, updatedAt: new Date() }).where(eq(sponsors.id, record.id));
  return NextResponse.json({ ok: true });
}
