import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { sendAccountApprovedEmail } from "@/lib/email";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action === "approve" || body.action === "deny" ? body.action : null;
    if (!action) {
      return NextResponse.json({ error: "Choose approve or deny." }, { status: 400 });
    }

    const [before] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, id), isNull(members.deletedAt)))
      .limit(1);
    if (!before) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const decidedAt = new Date();
    await db.transaction(async (transaction) => {
      await transaction
        .update(members)
        .set({
          adminApprovedAt: action === "approve" ? decidedAt : null,
          adminApprovalDeniedAt: action === "deny" ? decidedAt : null,
          updatedAt: decidedAt,
        })
        .where(eq(members.id, id));

      if (action === "deny") {
        await transaction
          .update(profiles)
          .set({ isPublished: false, updatedAt: decidedAt })
          .where(eq(profiles.memberId, id));
      }
    });

    await recordAdminAudit({
      adminId: admin.id,
      action,
      resourceType: "member",
      resourceId: id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: {
        adminApprovedAt: action === "approve" ? decidedAt.toISOString() : null,
        adminApprovalDeniedAt: action === "deny" ? decidedAt.toISOString() : null,
      },
      detail: action === "approve"
        ? `Approved member account for ${before.name}.`
        : `Denied member account for ${before.name}; account data was retained and sign-in remains blocked.`,
    });

    if (action === "approve" && !before.adminApprovedAt) await sendAccountApprovedEmail({ email: before.email, name: before.name }).catch((error) => console.warn("Approval saved; email could not be sent", error));
    return NextResponse.json({ ok: true, status: action === "approve" ? "approved" : "denied" });
  } catch (error) {
    console.error("Admin account approval decision failed", error);
    return NextResponse.json({ error: "Could not save the account decision." }, { status: 500 });
  }
}
