export type BillingInterval = "month" | "year";
export type MembershipPlanKey =
  | "creator"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "pro"
  | "promoter_launch"
  | "promoter_growth"
  | "promoter_pro"
  | "promoter_agency"
  | "sponsor_partner"
  | "sponsor_growth"
  | "sponsor_activation"
  | "sponsor_premier"
  | "sponsor_silver"
  | "sponsor_gold"
  | "sponsor_platinum"
  | "sponsor_diamond";

export type MembershipGroup = "creative" | "host" | "sponsor";

export type MembershipPlan = {
  key: MembershipPlanKey;
  name: string;
  group: MembershipGroup;
  monthlyCents: number;
  items: string[];
};

export const annualDiscount = 0.08;

export function annualDiscountForPlan(plan: MembershipPlan) {
  if (plan.key === "gold" || plan.key === "sponsor_gold") return 0.1;
  if (plan.key === "platinum" || plan.key === "sponsor_platinum") return 0.12;
  if (plan.key === "diamond" || plan.key === "sponsor_diamond") return 0.15;
  return annualDiscount;
}

export const membershipPlans: MembershipPlan[] = [
  { key: "creator", name: "Creator", group: "creative", monthlyCents: 800, items: ["8 optimized portfolio images", "Uploads up to 15 MB; resized to 1080px", "Private blurred-image controls", "Member messaging and social links"] },
  { key: "silver", name: "Silver", group: "creative", monthlyCents: 1900, items: ["16 optimized portfolio images", "Everything in Creator", "Verification eligibility and event invitations", "Instagram tiled-feed connection"] },
  { key: "gold", name: "Gold", group: "creative", monthlyCents: 3900, items: ["24 optimized portfolio images", "Enhanced discovery placement", "Profile activity insights", "Priority collaboration and message alerts"] },
  { key: "platinum", name: "Platinum", group: "creative", monthlyCents: 6900, items: ["40 optimized portfolio images", "Top-tier discovery placement", "Advanced profile and Instagram analytics", "Priority member support"] },
  { key: "diamond", name: "Diamond", group: "creative", monthlyCents: 12900, items: ["60 optimized portfolio images", "Featured campaign consideration", "Concierge collaboration matching", "Highest discovery and messaging priority"] },
  { key: "promoter_launch", name: "Launch", group: "host", monthlyCents: 2500, items: ["One active event", "Ticket and participant management", "Basic event analytics", "Standard support"] },
  { key: "promoter_growth", name: "Growth", group: "host", monthlyCents: 5000, items: ["Three active events", "All participation paths", "Sponsor outreach", "Audience exports"] },
  { key: "promoter_pro", name: "Pro", group: "host", monthlyCents: 9900, items: ["Ten active events", "Priority event placement", "Advanced conversion analytics", "Reduced platform fees"] },
  { key: "promoter_agency", name: "Agency", group: "host", monthlyCents: 19900, items: ["Unlimited active events", "Team access", "Branded host tools", "Priority operations support"] },
  { key: "sponsor_silver", name: "Silver", group: "sponsor", monthlyCents: 4900, items: ["Verified sponsor profile", "Five event approaches monthly", "Partnership inbox", "Basic opportunity alerts"] },
  { key: "sponsor_gold", name: "Gold", group: "sponsor", monthlyCents: 9900, items: ["Fifteen event approaches monthly", "Campaign and product profile", "Targeted opportunity alerts", "Two team seats"] },
  { key: "sponsor_platinum", name: "Platinum", group: "sponsor", monthlyCents: 24900, items: ["Unlimited event approaches", "Activation workspace", "Performance summaries", "Five team seats"] },
  { key: "sponsor_diamond", name: "Diamond", group: "sponsor", monthlyCents: 49900, items: ["Priority partnership matching", "Category exclusivity requests", "Portfolio-level reporting", "Dedicated partnership review"] },
];

export function annualCents(plan: MembershipPlan) {
  return Math.round(plan.monthlyCents * 12 * (1 - annualDiscountForPlan(plan)));
}

export function membershipGroupForRole(role: string): MembershipGroup {
  if (role === "sponsor") return "sponsor";
  if (role === "host" || role === "promoter" || role === "organizer") return "host";
  return "creative";
}

export function lookupKey(plan: MembershipPlanKey, interval: BillingInterval) {
  return `model_escape_${plan}_${interval === "year" ? "annual" : "monthly"}`;
}

export function findMembershipPlan(plan: string) {
  return membershipPlans.find((candidate) => candidate.key === plan);
}
