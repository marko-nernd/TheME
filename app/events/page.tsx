import { eventStartingPriceLabel } from "@/lib/event-starting-price";
import Image from "next/image";
import Link from "next/link";
import PublicDirectoryShell from "@/components/public-directory-shell";
import { getPublishedEvents, getSitePageSettings } from "@/db/queries";
import { publicAvailabilityLabel } from "@/lib/event-availability";

export const dynamic = "force-dynamic";
const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "America/Phoenix" });
export async function generateMetadata() {
  const page = await getSitePageSettings("events");
  return { title: page.seoTitle || page.title, description: page.seoDescription || page.intro, openGraph: { images: [page.shareImagePath || page.imagePath] } };
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ sponsorships?: string }> }) {
  const page = await getSitePageSettings("events");
  const sponsorshipsOnly = (await searchParams).sponsorships === "1";
  let events: Awaited<ReturnType<typeof getPublishedEvents>> = [];
  try { events = await getPublishedEvents(); } catch { /* Docker database may be offline during a static preview. */ }
  if (sponsorshipsOnly) events = events.filter((event) => event.participationPaths.some((path) => path.type === "sponsor" && path.enabled));
  return <PublicDirectoryShell
    active="events"
    eyebrow={page.eyebrow}
    title={page.title}
    intro={page.intro}
    image={page.imagePath || "/images/desert-model.jpg"}
    count={events.length}
    countLabel={sponsorshipsOnly ? "sponsor-ready events" : "upcoming events"}
    actionLabel="Create an event"
    actionHref="/host/new"
    headerBackgroundColor={page.headerBackgroundColor}
  >
    <section className="public-directory-content">
      <div className="public-directory-toolbar">
        <div>
          <p className="eyebrow"><span />{sponsorshipsOnly ? "Sponsor-ready" : "Upcoming"}</p>
          <h2>{sponsorshipsOnly ? "Find an event to support." : "Choose where you’ll create next."}</h2>
        </div>
        <nav className="public-filter-pills" aria-label="Event filters">
          <Link className={!sponsorshipsOnly ? "is-active" : ""} href="/events">All events</Link>
          <Link className={sponsorshipsOnly ? "is-active" : ""} href="/events?sponsorships=1">Seeking sponsors</Link>
        </nav>
      </div>
      <div className="events-directory-list public-event-grid">{events.map((event) => (
        <article className="events-directory-card" key={event.id}>
          <Link className="events-directory-image" href={`/events/${event.slug}`}>
            {event.hasMedia && event.mediaType === "video" ? (
              <video
                src={`/api/events/${event.id}/media`}
                poster={`/api/events/${event.id}/media?poster=1`}
                autoPlay muted loop playsInline preload="metadata"
                aria-label={`${event.title} preview`}
              />
            ) : (
              <Image unoptimized src={event.hasMedia ? `/api/events/${event.id}/media` : event.imagePath} alt={`${event.title} preview`} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
            )}
            <span className="events-directory-shade" />
            <span className="public-card-badge">{event.category}</span>
            <span className="events-directory-overlay">
              <time>{formatter.format(event.startsAt)}</time>
              <strong>{event.title}</strong>
              <span>{event.location}</span>
            </span>
          </Link>
          <div className="events-directory-action">
            <span>{publicAvailabilityLabel(event.capacity, event.spotsRemaining)}</span>
            <span className="public-event-price">From <b>{eventStartingPriceLabel(event)}</b></span>
            <Link className="public-arrow-link" href={`/events/${event.slug}`} aria-label={`View ${event.title}`}>→</Link>
          </div>
        </article>
      ))}</div>
      {events.length === 0 && <div className="public-empty-state"><span>00</span><h3>No matching events yet.</h3><p>Try another view or create the next opportunity.</p></div>}
    </section>
    <section className="public-cta-strip"><div><p className="eyebrow light"><span />Have an event idea?</p><h2>Build the room you want to work in.</h2></div><Link className="button public-primary-button" href="/host">See the Host process ↗</Link></section>
  </PublicDirectoryShell>;
}
