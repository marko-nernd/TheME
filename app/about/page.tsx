import Link from "next/link";
import PageShell from "@/components/page-shell";
import { getSitePageSettings } from "@/db/queries";

export const dynamic = "force-dynamic";
export default async function AboutPage() {
  const page = await getSitePageSettings("about");
  return <PageShell eyebrow={page.eyebrow} title={page.title} intro={page.intro} image={page.imagePath || "/images/creative-planning.png"} headerBackgroundColor={page.headerBackgroundColor}>
    <section className="content-section two-column"><div><p className="eyebrow"><span />Our point of view</p><h2>Good work needs more than access.</h2></div><div className="prose"><p>Model Escape is a private creative network for models, photographers, producers, and the people who bring them together. We believe trust, preparation, and a remarkable setting change the quality of the work.</p><p>Every public profile is reviewed. Every hosted experience begins with a feasible budget and production plan. Every participant sees the brief before committing.</p></div></section>
    <section className="dark-section"><div className="content-section"><p className="eyebrow light"><span />How we operate</p><div className="value-grid"><article><span>01</span><h3>Curated, not crowded</h3><p>Relevant people and purposeful events over an endless content feed.</p></article><article><span>02</span><h3>Brief before buzz</h3><p>Scope, deliverables, roles, safety, and costs are clear before launch.</p></article><article><span>03</span><h3>Portfolio outcomes</h3><p>Events are designed around work participants can actually use.</p></article></div></div></section>
    <section className="cta-band"><div><p className="eyebrow"><span />Build with us</p><h2>Have the concept and the capital?</h2></div><Link className="button" href="/host/new">Start an event proposal ↗</Link></section>
  </PageShell>;
}
