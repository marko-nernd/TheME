import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/page-shell";
import SponsorshipRequestForm from "@/components/sponsorship-request-form";
import { getCurrentMember } from "@/lib/auth";
import { getEventBySlug, getProfileBySlug, getPublishedEvents, getPublishedProfiles, getSponsorForMember } from "@/db/queries";

export const dynamic = "force-dynamic";

type TargetType = "event" | "model" | "photographer";
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Phoenix" });

export default async function SponsorshipsPage({ searchParams }: { searchParams: Promise<{ type?: string; event?: string; member?: string; q?: string }> }) {
  const params = await searchParams;
  const member = params.member ?? "";
  const eventSlug = params.event ?? "";
  const search = (params.q ?? "").trim().toLowerCase();
  const [currentMember, event, target, publishedEvents, publishedProfiles] = await Promise.all([
    getCurrentMember(), eventSlug ? getEventBySlug(eventSlug) : Promise.resolve(null),
    member ? getProfileBySlug(member) : Promise.resolve(null), getPublishedEvents(), getPublishedProfiles(),
  ]);
  const sponsor = currentMember ? await getSponsorForMember(currentMember.id) : null;
  if (!currentMember) {
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) nextParams.set(key, value);
    redirect(`/login?next=${encodeURIComponent(`/sponsorships${nextParams.size ? `?${nextParams}` : ""}`)}`);
  }
  if (!sponsor) redirect("/dashboard");
  const inferredType = target?.profile.role === "photographer" ? "photographer" : target?.profile.role === "model" ? "model" : null;
  const type: TargetType | null = params.type === "event" || params.type === "model" || params.type === "photographer"
    ? params.type : eventSlug && !member ? "event" : inferredType;
  const targetMember = target?.profile.memberId && ["model", "photographer"].includes(target.profile.role)
    ? { id: target.profile.memberId, name: target.profile.name, role: target.profile.role } : null;
  const sponsorReadyEvents = publishedEvents.filter((candidate) => candidate.participationPaths.some((path) => path.type === "sponsor" && path.enabled));
  const talentReadyEvents = targetMember ? publishedEvents.filter((candidate) => candidate.participationPaths.some((path) => path.type === targetMember.role && path.enabled)) : publishedEvents;
  const visibleEvents = (type === "event" ? sponsorReadyEvents : publishedEvents).filter((candidate) => !search || `${candidate.title} ${candidate.location} ${candidate.category}`.toLowerCase().includes(search));
  const visiblePeople = publishedProfiles.filter((profile) => profile.role === type && (!search || `${profile.name} ${profile.location} ${profile.specialties.join(" ")}`.toLowerCase().includes(search)));
  const step = event ? 3 : type ? 2 : 1;
  const travelEligible = Boolean(event && (event.passportRequired || event.category.toLowerCase().includes("destination") || event.category.toLowerCase().includes("photoshoot") || event.shootTypes.length > 0));

  return <PageShell eyebrow="Sponsor marketplace" title="Choose who you want to support." intro="Find an event, model, or photographer. Build one clear offer, agree on the terms, then pay or deliver through the partnership workspace." image="/images/poolside-network.png">
    <section className="sponsor-marketplace">
      <ol className="sponsor-marketplace-steps" aria-label="Sponsorship progress">
        {["Who to sponsor", "Choose person / event", "Send an offer"].map((label, index) => <li className={step === index + 1 ? "is-active" : step > index + 1 ? "is-complete" : ""} aria-current={step === index + 1 ? "step" : undefined} key={label}><span>{step > index + 1 ? "✓" : `0${index + 1}`}</span><b>{label}</b></li>)}
      </ol>
      <p className="sponsor-walkthrough-note">Step {step} of 3 · {step === 1 ? "Choose an event, model, or photographer." : step === 2 ? "Choose the person or event your offer will support." : "Send your proposal. You will review an agreement before any payment."}</p>

      {!type && <>
        <header className="sponsor-marketplace-heading"><p className="eyebrow"><span />Start here</p><h2>What would you like to sponsor?</h2><p>Choose one path. We will only show the information and fields needed for that partnership.</p></header>
        <div className="sponsor-target-grid">
          <Link href="/sponsorships?type=event"><span>01</span><b>EVENT</b><h3>Sponsor an event</h3><p>Support a production with cash, venue, products, media, travel, or hospitality.</p><strong>Find sponsor-ready events →</strong></Link>
          <Link href="/sponsorships?type=model"><span>02</span><b>MODEL</b><h3>Sponsor a model</h3><p>Cover event costs, flights, hotel, cash, wardrobe, or representation deliverables.</p><strong>Find models →</strong></Link>
          <Link href="/sponsorships?type=photographer"><span>03</span><b>PHOTOGRAPHER</b><h3>Sponsor a photographer</h3><p>Support travel, equipment, production costs, content, or campaign deliverables.</p><strong>Find photographers →</strong></Link>
        </div>
      </>}

      {type && !event && !targetMember && <>
        <div className="sponsor-marketplace-toolbar"><div><Link href="/sponsorships">← Change target</Link><p className="eyebrow"><span />Step 2</p><h2>{type === "event" ? "Choose a sponsor-ready event." : `Choose a ${type}.`}</h2></div><form><input type="hidden" name="type" value={type} /><label>Search<input name="q" defaultValue={params.q ?? ""} placeholder={`Search ${type === "event" ? "events or locations" : `${type}s or locations`}`} /></label><button type="submit">Search</button></form></div>
        {type === "event" ? <div className="sponsor-opportunity-grid">{visibleEvents.map((candidate) => <Link href={`/sponsorships?type=event&event=${encodeURIComponent(candidate.slug)}`} key={candidate.id}>
          <div>{candidate.hasMedia ? <Image unoptimized src={`/api/events/${candidate.id}/media${candidate.mediaType === "video" ? "?poster=1" : ""}`} alt="" fill sizes="(max-width: 800px) 100vw, 33vw" /> : <Image unoptimized src={candidate.imagePath} alt="" fill sizes="(max-width: 800px) 100vw, 33vw" />}</div><span>{candidate.category}</span><h3>{candidate.title}</h3><p>{candidate.location}</p><small>{date.format(candidate.startsAt)}</small><strong>Build event offer →</strong>
        </Link>)}</div> : <div className="sponsor-person-grid">{visiblePeople.map((profile) => <Link href={`/sponsorships?type=${type}&member=${encodeURIComponent(profile.slug)}`} key={profile.id}>
          <div><Image unoptimized src={profile.imagePath} alt="" fill sizes="(max-width: 700px) 50vw, 20vw" /></div><span>{profile.membershipTier}</span><h3>{profile.name}</h3><p>{profile.location}</p><strong>Choose {type} →</strong>
        </Link>)}</div>}
        {(type === "event" ? visibleEvents : visiblePeople).length === 0 && <div className="public-empty-state"><span>00</span><h3>No matches found.</h3><p>Clear the search or choose another sponsorship path.</p></div>}
      </>}

      {type !== "event" && targetMember && !event && <>
        <div className="sponsor-marketplace-toolbar"><div><Link href={`/sponsorships?type=${type}`}>← Choose another {type}</Link><p className="eyebrow"><span />Step 2</p><h2>Which event will {targetMember.name} attend?</h2><p>The event keeps travel, deliverables, agreements, and fulfillment tied to one real opportunity.</p></div></div>
        <div className="sponsor-opportunity-grid">{talentReadyEvents.map((candidate) => <Link href={`/sponsorships?type=${type}&member=${encodeURIComponent(member)}&event=${encodeURIComponent(candidate.slug)}`} key={candidate.id}>
          <div>{candidate.hasMedia ? <Image unoptimized src={`/api/events/${candidate.id}/media${candidate.mediaType === "video" ? "?poster=1" : ""}`} alt="" fill sizes="(max-width: 800px) 100vw, 33vw" /> : <Image unoptimized src={candidate.imagePath} alt="" fill sizes="(max-width: 800px) 100vw, 33vw" />}</div><span>{candidate.passportRequired ? "Travel / passport" : candidate.category}</span><h3>{candidate.title}</h3><p>{candidate.location}</p><small>{date.format(candidate.startsAt)}</small><strong>Use this event →</strong>
        </Link>)}</div>
        {!talentReadyEvents.length && <div className="public-empty-state"><span>00</span><h3>No eligible events yet.</h3><p>This person can be sponsored when an upcoming event enables their participation role.</p></div>}
      </>}

      {event && (!member || targetMember) && <div className="sponsor-offer-stage">
        <aside className="sponsor-offer-summary">
          <Link className="sponsor-change-opportunity" href={targetMember ? `/sponsorships?type=${type}&member=${encodeURIComponent(member)}` : "/sponsorships?type=event"}>← Change opportunity</Link>
          <div className="sponsor-selected-target"><span>SELECTED PARTNERSHIP</span><h2>{targetMember ? targetMember.name : event.title}</h2>{targetMember && <b>{targetMember.role}</b>}</div>
          {targetMember && <section className="sponsor-selected-event"><span>FOR THIS EVENT</span><h3>{event.title}</h3><p>{event.location}</p><time>{date.format(event.startsAt)}</time></section>}
          {!targetMember && <section className="sponsor-selected-event"><span>EVENT DETAILS</span><p>{event.location}</p><time>{date.format(event.startsAt)}</time></section>}
          <small>You can change this selection before sending the offer.</small>
        </aside>
        <SponsorshipRequestForm event={{ id: event.id, title: event.title }} sponsors={[{ id: sponsor.id, name: sponsor.name, category: sponsor.category }]} direction={targetMember ? "sponsor_to_member" : "sponsor_to_event"} targetMember={targetMember} travelEligible={travelEligible} lockSponsor />
      </div>}

      {member && !targetMember && <div className="notice-box"><strong>Member unavailable</strong><p>This member cannot currently receive a sponsorship request.</p><Link href={`/sponsorships?type=${type ?? "model"}`}>Choose another person →</Link></div>}
    </section>
  </PageShell>;
}
