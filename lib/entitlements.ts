import { pool } from "@/db";

export type MembershipEntitlements = {
  plan: string;
  activeEventLimit: number;
  monthlySponsorOutreachLimit: number;
};

const planEntitlements: Record<string, Omit<MembershipEntitlements, "plan">> = {
  promoter_launch: { activeEventLimit: 1, monthlySponsorOutreachLimit: 3 },
  promoter_growth: { activeEventLimit: 3, monthlySponsorOutreachLimit: 15 },
  promoter_pro: { activeEventLimit: 10, monthlySponsorOutreachLimit: 50 },
  promoter_agency: { activeEventLimit: 9999, monthlySponsorOutreachLimit: 9999 },
  sponsor_partner: { activeEventLimit: 0, monthlySponsorOutreachLimit: 3 },
  sponsor_growth: { activeEventLimit: 0, monthlySponsorOutreachLimit: 10 },
  sponsor_activation: { activeEventLimit: 0, monthlySponsorOutreachLimit: 9999 },
  sponsor_premier: { activeEventLimit: 0, monthlySponsorOutreachLimit: 9999 },
  sponsor_silver: { activeEventLimit: 0, monthlySponsorOutreachLimit: 5 },
  sponsor_gold: { activeEventLimit: 0, monthlySponsorOutreachLimit: 15 },
  sponsor_platinum: { activeEventLimit: 0, monthlySponsorOutreachLimit: 9999 },
  sponsor_diamond: { activeEventLimit: 0, monthlySponsorOutreachLimit: 9999 },
};

export async function getMemberEntitlements(memberId: string) {
  const result = await pool.query(
    `select coalesce(
              nullif(member.membership_tier_override, 'none'),
              (
                select subscription.plan
                  from subscriptions subscription
                  join billing_customers customer on customer.id = subscription.billing_customer_id
                 where customer.member_id = member.id
                   and subscription.status in ('active', 'trialing', 'past_due')
                 order by subscription.updated_at desc
                 limit 1
              )
            ) as plan
       from members member
      where member.id = $1
        and member.deleted_at is null`,
    [memberId],
  );
  const plan = result.rows[0]?.plan as string | undefined;
  const values = plan ? planEntitlements[plan] : null;
  if (!plan || !values) return null;
  return { plan, ...values } satisfies MembershipEntitlements;
}

export async function getEventCapacity(memberId: string, excludedProposalId?: string) {
  const entitlements = await getMemberEntitlements(memberId);
  if (!entitlements?.activeEventLimit) {
    return { ok: false as const, error: "Choose a Host membership before creating an event." };
  }
  const count = await pool.query(
    `select (
       (select count(*) from events where owner_id = $1 and coalesce(ends_at, starts_at) >= now())
       +
       (select count(*) from event_proposals
         where member_id = $1
           and status in ('submitted', 'reviewing')
           and ($2::uuid is null or id <> $2::uuid))
     )::int as total`,
    [memberId, excludedProposalId ?? null],
  );
  const used = Number(count.rows[0]?.total ?? 0);
  if (used >= entitlements.activeEventLimit) {
    return {
      ok: false as const,
      error: `${entitlements.plan.replaceAll("_", " ")} allows ${entitlements.activeEventLimit} active event${entitlements.activeEventLimit === 1 ? "" : "s"}.`,
    };
  }
  return {
    ok: true as const,
    entitlements,
    used,
    remaining: Math.max(0, entitlements.activeEventLimit - used),
  };
}

export const assertEventCapacity = getEventCapacity;

export async function assertSponsorOutreachCapacity(memberId: string) {
  const entitlements = await getMemberEntitlements(memberId);
  if (!entitlements?.monthlySponsorOutreachLimit) {
    return { ok: false as const, error: "Choose an eligible Host or Sponsor membership before sending partnership outreach." };
  }
  const count = await pool.query(
    `select count(*)::int as total
       from sponsorship_requests
      where requester_member_id = $1
        and created_at >= now() - interval '30 days'`,
    [memberId],
  );
  if (Number(count.rows[0]?.total ?? 0) >= entitlements.monthlySponsorOutreachLimit) {
    return {
      ok: false as const,
      error: `Your ${entitlements.plan.replaceAll("_", " ")} outreach allowance has been used for this 30-day period.`,
    };
  }
  return { ok: true as const, entitlements };
}
