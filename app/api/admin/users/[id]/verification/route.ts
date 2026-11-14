import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { identityAuditLogs, identityDocuments, members, profiles } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const action = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (!action || (action === "rejected" && notes.length < 5)) {
    return NextResponse.json({ error: "Choose a decision and include rejection notes." }, { status: 400 });
  }
  const [document] = await db
    .select({ id: identityDocuments.id })
    .from(identityDocuments)
    .where(eq(identityDocuments.memberId, id))
    .limit(1);
  if (!document) return NextResponse.json({ error: "No ID document was submitted." }, { status: 404 });
  await db.transaction(async (transaction) => {
    await transaction
      .update(members)
      .set({
        identityVerificationStatus: action,
        identityVerifiedAt: action === "approved" ? new Date() : null,
        identityReviewNotes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(members.id, id));
    await transaction
      .update(profiles)
      .set({ isVerified: action === "approved", updatedAt: new Date() })
      .where(eq(profiles.memberId, id));
    await transaction.insert(identityAuditLogs).values({
      memberId: id,
      adminId: admin.id,
      action: action === "approved" ? "verification_approved" : "verification_rejected",
      detail: notes,
    });
  });
  return NextResponse.json({ ok: true, status: action });
}
