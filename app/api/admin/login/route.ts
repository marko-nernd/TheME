import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminAccounts } from "@/db/schema";
import {
  adminSessionCookieName,
  createAdminSession,
} from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username =
      typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const [admin] = await db
      .select()
      .from(adminAccounts)
      .where(eq(adminAccounts.username, username))
      .limit(1);

    if (
      !admin ||
      !admin.isActive ||
      !(await verifyPassword(password, admin.passwordHash))
    ) {
      return NextResponse.json(
        { error: "Username or password is incorrect." },
        { status: 401 },
      );
    }

    const session = await createAdminSession(admin.id);
    await db
      .update(adminAccounts)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminAccounts.id, admin.id));
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminSessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://"),
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    console.error("Admin login failed", error);
    return NextResponse.json(
      { error: "Admin sign in is temporarily unavailable." },
      { status: 503 },
    );
  }
}
