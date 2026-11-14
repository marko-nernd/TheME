import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { eventProposals } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function ProposalPreview({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) redirect("/admin/login");
  const [proposal] = await db.select().from(eventProposals).where(eq(eventProposals.id, (await params).id)).limit(1);
  if (!proposal) notFound();
  return <main className="proposal-preview-page">
    <Link href="/admin">← Admin events</Link>
    <p className="eyebrow"><span />Proposal preview · {proposal.status}</p>
    <h1>{proposal.title}</h1>
    <p className="proposal-preview-intro">{proposal.introSentence}</p>
    <section><div><span>Type</span><strong>{proposal.eventType}</strong></div><div><span>Location</span><strong>{proposal.location}</strong></div><div><span>Timing</span><strong>{proposal.timing}</strong></div><div><span>Submitted by</span><strong>{proposal.contactName} · {proposal.contactEmail}</strong></div></section>
    <article><h2>{proposal.introSentence}</h2><p>{proposal.fullDescription}</p></article>
    <article><h2>Participation</h2>{proposal.participationPaths.filter((path) => path.enabled).map((path) => <p key={path.type}><strong>{path.title}</strong> · {path.capacity} spots · ${(path.priceCents / 100).toFixed(2)} each</p>)}</article>
    {proposal.rejectionReason && <article className="proposal-rejection-reason"><h2>Rejection reason</h2><p>{proposal.rejectionReason}</p></article>}
  </main>;
}
