import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { collaborationMessages, collaborationRequests, identityAuditLogs } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

export async function DELETE(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const body = await request.json();
  const items: Array<{ id?: unknown; kind?: unknown }> = Array.isArray(body.items) ? body.items.slice(0, 500) : [];
  const replyIds = items.filter((item): item is { id: string; kind: "reply" } => item?.kind === "reply" && typeof item.id === "string").map((item) => item.id);
  const requestIds = items.filter((item): item is { id: string; kind: "initial" } => item?.kind === "initial" && typeof item.id === "string").map((item) => item.id);
  if (!replyIds.length && !requestIds.length) return NextResponse.json({ error: "Select at least one message." }, { status: 400 });
  await db.transaction(async (transaction) => {
    if (replyIds.length) await transaction.delete(collaborationMessages).where(inArray(collaborationMessages.id, replyIds));
    if (requestIds.length) await transaction.delete(collaborationRequests).where(inArray(collaborationRequests.id, requestIds));
    await transaction.insert(identityAuditLogs).values({
      adminId: admin.id,
      action: "admin_messages_deleted",
      detail: `${replyIds.length + requestIds.length} selected communication record(s) deleted.`,
    });
  });
  return NextResponse.json({ ok: true, deleted: replyIds.length + requestIds.length });
}
