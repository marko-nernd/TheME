import Link from "next/link";
import PageShell from "@/components/page-shell";
import { getSitePageSettings } from "@/db/queries";

const roles = [
  { name: "Host", copy: "You own the concept, promotion, budget, venue, participation, and operating decisions." },
];
const stages = [
  ["01", "Create the event", "Your account supplies the host identity. Add dates, location, shoot type, hero media, refund terms, and participation paths."],
  ["02", "Publish your event", "Approved Host accounts publish automatically when all required event details are complete."],
  ["03", "Build your team", "Invite models and photographers, receive bookings, and approach sponsors from your event workspace."],
  ["04", "Manage people and messages", "Check confirmed bookings, respond to any pending requests, and keep conversations in your inbox."],
  ["05", "Collect event payments", "Use embedded local Stripe payments or redirect to an approved external event website."],
  ["06", "Operate and review", "Track attendance, transactions, withdrawals, ratings, and verified no-show reports after the event."],
];
const hostPlans = [
  ["Launch · $25/month", "1 active event", "Applicants, tickets, analytics"],
  ["Growth · $50/month", "3 active events", "All participation paths and sponsor outreach"],
  ["Pro · $99/month", "10 active events", "Priority placement and conversion analytics"],
  ["Agency · $199/month", "Unlimited events", "Team and branded host tools"],
];

export const dynamic = "force-dynamic";

export default async function HostPage() {
  const page = await getSitePageSettings("host");
  return <PageShell eyebrow={page.eyebrow} title={page.title} intro={page.intro} image={page.imagePath || "/images/creative-planning.png"} headerBackgroundColor={page.headerBackgroundColor}>
    <section className="content-section"><div className="section-heading"><div><p className="eyebrow"><span />One clear role</p><h2>Everything an event lead needs.</h2></div><p className="section-intro">Your approved Host account identifies the accountable event owner automatically.</p></div><div className="role-grid">{roles.map(role => <article key={role.name}><span>FOR THE</span><h3>{role.name}</h3><p>{role.copy}</p></article>)}</div></section>
    <section className="content-section"><div className="section-heading"><div><p className="eyebrow"><span />Host memberships</p><h2>Capacity that grows with your operation.</h2></div><Link href="/membership" className="quiet-dark-link">Compare memberships →</Link></div><div className="host-plan-grid">{hostPlans.map(([name, limit, tools]) => <article key={name}><h3>{name}</h3><strong>{limit}</strong><p>{tools}</p></article>)}</div></section>
    <section className="dark-section"><div className="content-section"><p className="eyebrow light"><span />Event workflow</p><h2 className="light-heading">One event. Every operating step.</h2><div className="process-grid">{stages.map(([number, title, copy]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></div></section>
    <section className="content-section two-column"><div><p className="eyebrow"><span />Participation and payment</p><h2>Recruit creatives and sponsors from one event page.</h2></div><div className="prose"><p>Models, photographers, and guests follow the participation and pricing rules you choose. Sponsors can approach the event or respond to Host outreach.</p><p>The Host dashboard groups participation by event, preserves conversations, and shows Stripe transactions.</p><div className="notice-box"><strong>Refund control</strong><p>The default full-refund cutoff is 45 days before the event. Hosts can customize it or mark the event non-refundable.</p></div><Link className="button" href="/host/new">Create an event ↗</Link></div></section>
  </PageShell>;
}
