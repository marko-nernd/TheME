import { getCurrentAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { avatarSettings, changeAvatarSource, removeAvatar } from "@/lib/avatar-source";
import { uploadAvatar } from "@/lib/avatar-upload";
import { recordAdminAudit } from "@/lib/admin-audit";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
async function handle(request: Request, context: Context, method: string) {
 const admin = await getCurrentAdmin();
 if (!admin) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
 const { id } = await context.params;
 const [member] = await db.select({ id: members.id }).from(members).where(eq(members.id, id)).limit(1);
 if (!member) return NextResponse.json({ error: "User not found." }, { status: 404 });
 const response = method === "GET" ? await avatarSettings(id) : method === "POST" ? await uploadAvatar(request, id) : method === "PATCH" ? await changeAvatarSource(request, id) : await removeAvatar(id);
 if (method !== "GET" && response.ok) await recordAdminAudit({ adminId: admin.id, action: "update_avatar", resourceType: "member", resourceId: id, detail: `Profile photo ${method.toLowerCase()}` });
 return response;
}
export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const POST = (request: Request, context: Context) => handle(request, context, "POST");
export const PATCH = (request: Request, context: Context) => handle(request, context, "PATCH");
export const DELETE = (request: Request, context: Context) => handle(request, context, "DELETE");
