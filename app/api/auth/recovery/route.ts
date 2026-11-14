import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { accountRecoveryTokens, emailVerificationTokens, members, memberSessions } from "@/db/schema";
import { createToken, hashPassword, hashToken } from "@/lib/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "reset") {
      if (typeof body.token !== "string" || body.token.length < 30 || typeof body.password !== "string" || body.password.length < 10 || body.password.length > 256) return NextResponse.json({ error: "Use a valid reset link and a password of 10–256 characters." }, { status: 400 });
      const passwordHash = await hashPassword(body.password);
      const reset = await db.transaction(async (tx) => {
        const [token] = await tx.update(accountRecoveryTokens).set({ consumedAt: new Date() }).where(and(eq(accountRecoveryTokens.tokenHash, hashToken(body.token)), eq(accountRecoveryTokens.purpose, "password"), isNull(accountRecoveryTokens.consumedAt), gt(accountRecoveryTokens.expiresAt, new Date()))).returning({ memberId: accountRecoveryTokens.memberId });
        if (!token) return false;
        const [member] = await tx.update(members).set({ passwordHash, updatedAt: new Date() }).where(and(eq(members.id, token.memberId), isNull(members.deletedAt))).returning({ id: members.id });
        if (!member) return false;
        await tx.delete(memberSessions).where(eq(memberSessions.memberId, member.id));
        await tx.update(accountRecoveryTokens).set({ consumedAt: new Date() }).where(and(eq(accountRecoveryTokens.memberId, member.id), eq(accountRecoveryTokens.purpose, "password"), isNull(accountRecoveryTokens.consumedAt)));
        return true;
      });
      return reset ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "This reset link has expired or was already used. Request a new link." }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["password", "verification"].includes(body.action)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const token = createToken();
    const account = await db.transaction(async (tx) => {
      const [member] = await tx.select().from(members).where(and(eq(members.email, email), isNull(members.deletedAt))).for("update").limit(1);
      if (!member || (body.action === "verification" && member.emailVerifiedAt)) return null;
      const recent = await tx.select({ at: accountRecoveryTokens.createdAt }).from(accountRecoveryTokens).where(and(eq(accountRecoveryTokens.memberId, member.id), eq(accountRecoveryTokens.purpose, body.action), gt(accountRecoveryTokens.createdAt, new Date(Date.now() - 3600000))));
      if (recent.length >= 3 || recent.some((item) => item.at.getTime() > Date.now() - 60000)) return null;
      await tx.insert(accountRecoveryTokens).values({ memberId: member.id, purpose: body.action, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600000) });
      if (body.action === "verification") await tx.insert(emailVerificationTokens).values({ memberId: member.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 86400000) });
      return { name: member.name, email: member.email };
    });
    if (account) {
      if (body.action === "verification") await sendVerificationEmail({ ...account, token });
      else await sendPasswordResetEmail({ ...account, token });
    }
    return NextResponse.json({ ok: true, message: "If an eligible account exists, an email is on its way. Check your inbox and spam folder." });
  } catch (error) {
    console.error("Account recovery failed", error);
    return NextResponse.json({ error: "We could not send the email right now. Please try again shortly." }, { status: 503 });
  }
}
