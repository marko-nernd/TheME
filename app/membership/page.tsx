import Link from "next/link";
import PageShell from "@/components/page-shell";
import { getCurrentMember } from "@/lib/auth";
import {
  membershipGroupForRole,
} from "@/lib/membership-plans";
import { getSitePageSettings, getMemberSubscription } from "@/db/queries";
import MembershipPlanPicker from "@/components/membership-plan-picker";

export const dynamic = "force-dynamic";

const groupCopy = {
  creative: {
    eyebrow: "Creative membership",
    title: "Build visibility at your pace.",
    intro: "Memberships for models and photographers who want more portfolio space, introductions, and production access.",
  },
  host: {
    eyebrow: "Host membership",
    title: "Choose the operating power behind your events.",
    intro: "Event-business memberships scale from one active launch to a full agency event operation.",
  },
  sponsor: {
    eyebrow: "Sponsor membership",
    title: "Turn brand support into visible partnerships.",
    intro: "Sponsor plans increase opportunity access, team collaboration, activations, and partnership reporting.",
  },
};

const accountTypeStarts = [
  { role: "Model or photographer", price: "Start free", plan: "Basic", copy: "New models and photographers begin with a free public profile, social links, and event discovery. Upgrade when you need portfolio and contact tools." },
  { role: "Host", price: "$25/month", plan: "Launch", copy: "Start with one active event, participant management, payment paths, and event analytics." },
  { role: "Sponsor", price: "$49/month", plan: "Silver", copy: "A verified company profile, partnership inbox, opportunity alerts, and event approaches." },
];

export default async function MembershipPage() {
  const member = await getCurrentMember();
  const group = membershipGroupForRole(member?.primaryRole ?? "model");
  const copy = groupCopy[group];
  const page = await getSitePageSettings("membership");
  const current = member ? await getMemberSubscription(member.id, member.email) : null;

  return (
    <PageShell className="membership-page" eyebrow={member ? copy.eyebrow : page.eyebrow || copy.eyebrow} title={member ? copy.title : page.title || copy.title} intro={member ? copy.intro : page.intro || copy.intro} image={page.imagePath || "/images/daisy.jpg"} headerBackgroundColor={page.headerBackgroundColor}>
      {member ? <MembershipPlanPicker group={group} current={current} /> : <>
      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow"><span />Start by account type</p><h2>A membership built for your role.</h2></div>
          <p className="section-intro">Your primary account type determines the plans and operating tools available after approval.</p>
        </div>
        <div className="membership-start-grid">
          {accountTypeStarts.map((item) => <article key={item.role}><span>{item.role}</span><h3>{item.plan}</h3><strong>{item.price}</strong><p>{item.copy}</p></article>)}
        </div>
        <div className="notice-box">
          <strong>Stripe test mode</strong>
          <p>No real money will be charged. Use test card 4242 4242 4242 4242 with any future expiry and any three-digit CVC.</p>
        </div>
        <div className="membership-free-start">
          <strong>Models and photographers start free.</strong>
          <p>Create the account first. After administrator approval, paid upgrades and Stripe billing are available inside the member dashboard.</p>
        </div>
        <div className="membership-apply-cta">
          <div><p className="eyebrow light"><span />Member application</p><h2>Apply to join Model Escape.</h2><p>Choose your role, create your profile, and submit it for administrator approval.</p></div>
          <Link className="button button-light" href="/signup">Apply now ↗</Link>
        </div>
      </section>
      </>}
    </PageShell>
  );
}
