import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventProposals } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const [deleted] = await db.delete(eventProposals)
    .where(and(eq(eventProposals.id, (await params).id), inArray(eventProposals.status, ["rejected", "declined"])))
    .returning({ id: eventProposals.id });
  if (!deleted) return NextResponse.json({ error: "Only rejected proposals can be deleted." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
