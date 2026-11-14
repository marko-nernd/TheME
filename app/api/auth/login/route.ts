import { and, eq, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import {
  createSession,
  sessionCookieName,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const credential =
      typeof body.credential === "string"
        ? body.credential.trim().toLowerCase()
        : typeof body.email === "string"
          ? body.email.trim().toLowerCase()
          : "";
    const password = typeof body.password === "string" ? body.password : "";
    const [member] = await db
      .select()
      .from(members)
      .where(and(
        or(eq(members.email, credential), eq(members.username, credential)),
        isNull(members.deletedAt),
      ))
      .limit(1);

    if (!member || !(await verifyPassword(password, member.passwordHash))) {
      return NextResponse.json({ error: "Username/email or password is incorrect." }, { status: 401 });
    }
    if (!member.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Verify your email before signing in.", code: "verification_required" },
        { status: 403 },
      );
    }
    if (member.adminApprovalDeniedAt) {
      return NextResponse.json(
        { error: "Your account application was denied. Contact Model Escape support if you believe this was a mistake." },
        { status: 403 },
      );
    }
    if (!member.adminApprovedAt) {
      return NextResponse.json(
        { error: "Your email is verified. An administrator must approve your account before you can sign in.", code: "approval_pending" },
        { status: 403 },
      );
    }

    const session = await createSession(member.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Sign in is temporarily unavailable." }, { status: 503 });
  }
}
