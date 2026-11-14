import { redirect } from "next/navigation";
import PageShell from "@/components/page-shell";
import MembershipPlanPicker from "@/components/membership-plan-picker";
import { getCurrentMember } from "@/lib/auth";
import { getMemberSubscription } from "@/db/queries";
export const dynamic = "force-dynamic";
export default async function SponsorMembershipPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=/membership/sponsor");
  if (member.primaryRole !== "sponsor") redirect("/dashboard#billing");
  return <PageShell className="membership-page" eyebrow="Sponsor membership" title="Choose the tools for your brand." intro="Your membership gives you access to partnership tools. Sponsorship contributions are paid separately." image="/images/creative-planning.png"><MembershipPlanPicker group="sponsor" current={await getMemberSubscription(member.id, member.email)} /></PageShell>;
}
