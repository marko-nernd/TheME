import Link from "next/link";
import Image from "next/image";
import type { getEventAttendingPhotographers } from "@/db/queries";
type EventGroup = { id: string; title: string; slug: string; photographers: Awaited<ReturnType<typeof getEventAttendingPhotographers>> };
export default function ModelEventPhotographers({ events }: { events: EventGroup[] }) {
 return <section className="model-event-photographers" aria-labelledby="model-photographers-heading"><header><div><span>YOUR EVENT LINEUP</span><h2 id="model-photographers-heading">Photographers at your events</h2><p>Meet the confirmed photographers joining your upcoming events.</p></div></header>
  {events.map((event) => <article className="model-event-photographer-group" key={event.id}><header><h3>{event.title}</h3><Link href={`/events/${event.slug}#photographers`}>View event lineup →</Link></header>
    {event.photographers.length ? <ul>{event.photographers.map((person) => <li key={person.memberId}><Link href={`/members/${person.slug}`}><Image unoptimized src={person.avatarUpdatedAt ? `/api/members/${person.memberId}/avatar?v=${person.avatarUpdatedAt.getTime()}` : person.imagePath} alt="" width={64} height={64} /><span><strong>{person.name}</strong><small>{person.location}</small><b>View photographer →</b></span></Link></li>)}</ul> : <p>No photographers are confirmed for this event yet. They’ll appear here when they join.</p>}
  </article>)}
  {!events.length && <div className="dashboard-empty"><p>Your event photographers will appear here after you confirm an event booking.</p><Link className="button" href="/events">Browse events →</Link></div>}
 </section>;
}
