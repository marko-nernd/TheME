import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AstryxSurface from "@/components/astryx-surface";
import EventProposalWizard from "./proposal-wizard";
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { isHostRole } from "@/lib/roles";
import { getEventCapacity } from "@/lib/entitlements";
import { redirect } from "next/navigation";

export default async function NewProposalPage() {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt || !member.adminApprovedAt) redirect("/login?next=/host/new");
  const isHost = isHostRole(member?.primaryRole);
  if (!isHost) redirect("/events");
  const capacity = isHost ? await getEventCapacity(member.id) : null;
  return <main className="wizard-page"><SiteHeader inner /><section className="wizard-intro" id="top"><p className="eyebrow light"><span />Create an event</p><h1>Turn the idea into<br /><em>a workable brief.</em></h1><p>Five focused steps. Host events are automatically approved and published when you finish.</p>{capacity && (
    <div className={`event-capacity-notice ${capacity.ok ? "is-available" : "is-blocked"}`}>
      {capacity.ok ? (
        <><strong>{capacity.entitlements.plan.replaceAll("_", " ")} membership</strong><span>{capacity.entitlements.activeEventLimit >= 9999 ? "Unlimited active events" : `${capacity.remaining} of ${capacity.entitlements.activeEventLimit} event slots available`}</span></>
      ) : (
        <><strong>Membership required</strong><span>{capacity.error}</span><Link href="/membership">Choose a Host plan →</Link></>
      )}
    </div>
  )}</section><AstryxSurface><EventProposalWizard account={{
    role: member.primaryRole,
    name: member.name,
    email: member.email,
    organization: member.organization ?? "",
  }} /></AstryxSurface><SiteFooter /></main>;
}
