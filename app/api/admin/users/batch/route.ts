import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { purgeMemberAccount } from "@/lib/member-deletion";

export async function DELETE(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids)
      ? [...new Set((body.ids as unknown[]).filter((id): id is string => typeof id === "string"))].slice(0, 100)
      : [];
    if (!ids.length) return NextResponse.json({ error: "Select at least one user." }, { status: 400 });
    const deletedIds: string[] = [];
    const failedIds: string[] = [];
    let billingWarningCount = 0;
    for (const id of ids) {
      try {
        const result = await purgeMemberAccount(id);
        if (result.deleted) {
          deletedIds.push(id);
          billingWarningCount += result.billingWarnings.length;
        } else {
          failedIds.push(id);
        }
      } catch (error) {
        console.error("Admin batch member purge failed", { memberId: id, error });
        failedIds.push(id);
      }
    }
    if (!deletedIds.length) {
      return NextResponse.json({ error: "None of the selected accounts could be deleted.", deletedIds, failedIds }, { status: 500 });
    }
    return NextResponse.json({
      ok: failedIds.length === 0,
      deleted: deletedIds.length,
      deletedIds,
      failedIds,
      billingWarningCount,
    }, { status: failedIds.length ? 207 : 200 });
  } catch (error) {
    console.error("Admin batch user deletion failed", error);
    return NextResponse.json({ error: "The selected accounts could not all be deleted." }, { status: 500 });
  }
}
