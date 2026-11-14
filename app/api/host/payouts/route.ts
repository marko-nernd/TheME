import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { hostPayoutAccounts } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { getSiteUrl } from "@/lib/stripe";
import { getTestStripe, refreshHostPayout } from "@/lib/host-payouts";
export async function GET() {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || member.primaryRole !== "host") return NextResponse.json({ error: "Host account required." }, { status: 401 });
  const [account] = await db.select().from(hostPayoutAccounts).where(eq(hostPayoutAccounts.memberId, member.id)).limit(1);
  return NextResponse.json({ account: account ?? null, testMode: true }, { headers: { "cache-control": "private, no-store" } });
}
export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || !member.adminApprovedAt || member.primaryRole !== "host") return NextResponse.json({ error: "Approved host account required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "refresh") return NextResponse.json({ account: await refreshHostPayout(member.id), testMode: true });
    if (body.action !== "onboard") return NextResponse.json({ error: "Choose a payout setup action." }, { status: 400 });
    const stripe = getTestStripe();
    let [account] = await db.select().from(hostPayoutAccounts).where(eq(hostPayoutAccounts.memberId, member.id)).limit(1);
    if (!account) {
      // User explicitly starts this test setup. Bank/identity details are entered only on Stripe.
      const connected = await stripe.v2.core.accounts.create({ display_name: member.organization || member.name, contact_email: member.email, identity: { country: member.countryCode || "US" }, dashboard: "express", defaults: { currency: "usd", responsibilities: { fees_collector: "application", losses_collector: "application" } }, configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } }, metadata: { memberId: member.id, mode: "test" } }, { idempotencyKey: `host-connect-test-${member.id}` });
      if (connected.livemode) throw new Error("Live connected accounts are not enabled.");
      await db.insert(hostPayoutAccounts).values({ memberId: member.id, stripeAccountId: connected.id }).onConflictDoNothing();
      [account] = await db.select().from(hostPayoutAccounts).where(eq(hostPayoutAccounts.memberId, member.id)).limit(1);
    }
    const origin = getSiteUrl();
    const link = await stripe.v2.core.accountLinks.create({ account: account.stripeAccountId, use_case: { type: "account_onboarding", account_onboarding: { configurations: ["recipient"], refresh_url: `${origin}/dashboard?payout=refresh#billing`, return_url: `${origin}/dashboard?payout=returned#billing` } } });
    return NextResponse.json({ url: link.url, testMode: true });
  } catch (error) {
    console.error("Host test payout setup failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Test payout setup is unavailable. Enable Connect in your Stripe test dashboard, verify test credentials, then retry. No live account or transfer was created." }, { status: 503 });
  }
}
