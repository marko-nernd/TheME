import { eq } from "drizzle-orm";
import { db } from "@/db";
import { hostPayoutAccounts } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
export function getTestStripe() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("Only Stripe test mode is enabled for this feature. Configure a test secret key first.");
  return getStripe();
}
export async function refreshHostPayout(memberId: string) {
  const [stored] = await db.select().from(hostPayoutAccounts).where(eq(hostPayoutAccounts.memberId, memberId)).limit(1);
  if (!stored) return null;
  const account = await getTestStripe().v2.core.accounts.retrieve(stored.stripeAccountId, { include: ["configuration.recipient", "requirements"] });
  if (account.livemode || account.metadata?.memberId !== memberId) throw new Error("The connected account does not match this test host.");
  const balance = account.configuration?.recipient?.capabilities?.stripe_balance;
  const [updated] = await db.update(hostPayoutAccounts).set({ chargesEnabled: balance?.stripe_transfers?.status === "active", payoutsEnabled: balance?.payouts?.status === "active", detailsSubmitted: balance?.stripe_transfers?.status === "active", updatedAt: new Date() }).where(eq(hostPayoutAccounts.memberId, memberId)).returning();
  return updated;
}
