import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminAuditLogs, siteBrandSettings } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { cleanSiteBranding, defaultSiteBranding, getSiteBranding } from "@/lib/site-branding";

async function authorize() {
  return getCurrentAdmin();
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const settings = await getSiteBranding();
  return NextResponse.json({ format: "model-escape-branding", version: 1, exportedAt: new Date().toISOString(), settings }, {
    headers: { "content-disposition": `attachment; filename="model-escape-branding-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}

export async function PUT(request: Request) {
  const admin = await authorize();
  if (!admin) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const body = await request.json();
  const before = await getSiteBranding();
  const source = body?.action === "reset" ? defaultSiteBranding : body?.settings ?? body;
  const settings = cleanSiteBranding(source);
  await db.transaction(async (transaction) => {
    await transaction.insert(siteBrandSettings).values({ ...settings, updatedAt: new Date() }).onConflictDoUpdate({
      target: siteBrandSettings.id,
      set: { ...settings, updatedAt: new Date() },
    });
    await transaction.insert(adminAuditLogs).values({
      adminId: admin.id,
      action: body?.action === "restore" ? "restore_branding" : body?.action === "reset" ? "reset_branding" : "update_branding",
      resourceType: "site_branding",
      resourceId: "default",
      beforeData: before,
      afterData: settings,
      detail: "Platform branding and theme configuration updated.",
    });
  });
  return NextResponse.json({ ok: true, settings });
}
