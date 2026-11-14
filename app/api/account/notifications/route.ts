import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { memberNotifications } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const [items, [total]] = await Promise.all([
    db.select().from(memberNotifications).where(and(eq(memberNotifications.memberId, member.id), isNull(memberNotifications.readAt))).orderBy(desc(memberNotifications.createdAt)).limit(10),
    db.select({ value: count() }).from(memberNotifications).where(and(eq(memberNotifications.memberId, member.id), isNull(memberNotifications.readAt))),
  ]);
  return NextResponse.json({ items, unreadCount: total.value }, { headers: { "cache-control": "no-store" } });
}
export async function PATCH(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)).slice(0, 100) : [];
  if (body.all !== true && !ids.length) return NextResponse.json({ error: "Choose a notification." }, { status: 400 });
  await db.update(memberNotifications).set({ readAt: new Date() }).where(and(eq(memberNotifications.memberId, member.id), isNull(memberNotifications.readAt), body.all === true ? undefined : inArray(memberNotifications.id, ids)));
  return NextResponse.json({ ok: true });
}
