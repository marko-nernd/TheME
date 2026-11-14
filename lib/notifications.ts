import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { memberNotifications } from "@/db/schema";

export async function notifyMember(input: {
  memberId: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  resourceId?: string | null;
}) {
  return db.insert(memberNotifications).values(input).returning({ id: memberNotifications.id });
}

export async function getMemberNotifications(memberId: string) {
  return db.select().from(memberNotifications)
    .where(eq(memberNotifications.memberId, memberId))
    .orderBy(desc(memberNotifications.createdAt)).limit(30);
}

export async function getUnreadMemberNotifications(memberId: string) {
  return db.select().from(memberNotifications)
    .where(and(eq(memberNotifications.memberId, memberId), isNull(memberNotifications.readAt)))
    .orderBy(desc(memberNotifications.createdAt)).limit(10);
}
