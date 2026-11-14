import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getUnreadMemberNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ member: null }, { headers: { "cache-control": "no-store" } });
  }
  const [[profile], notifications] = await Promise.all([
    db.select({ slug: profiles.slug }).from(profiles).where(eq(profiles.memberId, member.id)).limit(1),
    getUnreadMemberNotifications(member.id),
  ]);
  return NextResponse.json(
    {
      member: {
        id: member.id,
        name: member.name,
        username: member.username,
        role: member.primaryRole,
        avatarVersion: member.avatarUpdatedAt?.getTime() ?? null,
        profileHref: profile?.slug
          ? `/members/${profile.slug}`
          : `/users/${member.username}`,
        notifications: notifications.slice(0, 5).map((notification) => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          href: notification.href ?? "/dashboard#activity",
        })),
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
