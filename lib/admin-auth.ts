import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { adminAccounts, adminSessions } from "@/db/schema";
import { createToken, hashToken } from "@/lib/auth";

export const adminSessionCookieName = "model_escape_admin_session";

export async function createAdminSession(adminId: string) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.insert(adminSessions).values({
    adminId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function getCurrentAdmin() {
  const token = (await cookies()).get(adminSessionCookieName)?.value;
  if (!token) return null;
  const [admin] = await db
    .select({
      id: adminAccounts.id,
      username: adminAccounts.username,
      lastLoginAt: adminAccounts.lastLoginAt,
    })
    .from(adminSessions)
    .innerJoin(adminAccounts, eq(adminSessions.adminId, adminAccounts.id))
    .where(
      and(
        eq(adminSessions.tokenHash, hashToken(token)),
        gt(adminSessions.expiresAt, new Date()),
        eq(adminAccounts.isActive, true),
      ),
    )
    .limit(1);
  return admin ?? null;
}
