import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ConfirmedModelCarousel from "@/components/confirmed-model-carousel";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import BackButton from "@/components/back-button";
import EventFlightInstructions from "@/components/event-flight-instructions";
import AttendeeFlightDetails from "@/components/attendee-flight-details";
import { eligibleFlightBooking } from "@/lib/attendee-flights";
import { hasTravelDetails } from "@/lib/event-travel-fields";
import MemberAvatarHoverCard from "@/components/member-avatar-hover-card";
import {
  getEventBySlug,
  getEventAttendingModels,
  getEventAttendingPhotographers,
  getMemberPaidEventParticipation,
  getEventParticipationAvailability,
} from "@/db/queries";
import { defaultParticipationPaths, participationDescription } from "@/lib/participation";
import { publicAvailabilityLabel } from "@/lib/event-availability";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCurrentMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Phoenix",
  timeZoneName: "short",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return event
    ? { title: `${event.title} — Model Escape`, description: event.summary }
    : { title: "Event not found — Model Escape" };
}

export default async function EventDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const paymentComplete = (await searchParams).payment === "success";
  const [event, member, admin] = await Promise.all([
    getEventBySlug((await params).slug),
    getCurrentMember(),
    getCurrentAdmin(),
  ]);
  if (!event) notFound();
  if (event.redirectToExternal && event.externalEventUrl) {
    redirect(event.externalEventUrl);
  }
  const canViewAttendees = Boolean(member?.emailVerifiedAt || admin);
  const [participationCounts, attendingModels, attendingPhotographers, paidParticipation] = await Promise.all([
    getEventParticipationAvailability(event.id),
    getEventAttendingModels(event.id),
    canViewAttendees ? getEventAttendingPhotographers(event.id) : Promise.resolve([]),
    member ? getMemberPaidEventParticipation(event.id, member.id) : Promise.resolve(null),
  ]);
  const participationPaths = event.participationPaths.length
    ? event.participationPaths
    : defaultParticipationPaths;
  const memberParticipationPath = member && ["model", "photographer"].includes(member.primaryRole)
    ? participationPaths.find((path) => path.enabled && path.type === member.primaryRole)
    : null;
  const isDestination = event.passportRequired || /destination|international|content trip|creative retreat/i.test(event.category);
  const showTravel = isDestination || hasTravelDetails(event.travelDetails) || Boolean(event.airportInfo.trim() || event.flightInstructions.trim());
  const alreadyPaid = Boolean(paidParticipation);
  const paidNotice = () => paidParticipation ? (
    <div className="event-already-paid" role="status">
      <strong>✓ Already paid</strong>
      <span>Your {paidParticipation.pathType} place is confirmed for this event.</span>
      <Link href={`/receipts/events/${paidParticipation.transactionId}`}>View transaction details →</Link>
    </div>
  ) : null;
  const attendeePrices = participationPaths
    .filter((path) => path.enabled && ["model", "photographer", "attendee"].includes(path.type))
    .map((path) => path.priceCents);
  const formatPrice = (cents: number) => new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(cents / 100);
  const price = attendeePrices.length
    ? Math.min(...attendeePrices) === Math.max(...attendeePrices)
      ? (attendeePrices[0] === 0 ? "Free" : formatPrice(attendeePrices[0]))
      : `${Math.min(...attendeePrices) === 0 ? "Free" : formatPrice(Math.min(...attendeePrices))}–${formatPrice(Math.max(...attendeePrices))}`
    : "Application only";
  const briefParagraphs = event.description
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="event-page">
      <SiteHeader inner />
      <BackButton fallback="/events" />
      {paymentComplete && <div className="dashboard-verification"><strong>Payment received.</strong> Your guest place is confirmed and the event details were emailed to you.</div>}
      <section className="event-detail-hero">
        {event.hasMedia && event.mediaType === "video" ? (
          <video
            src={`/api/events/${event.id}/media`}
            poster={`/api/events/${event.id}/media?poster=1`}
            autoPlay muted loop playsInline preload="metadata"
            aria-label={`${event.title} event preview`}
          />
        ) : (
          <Image unoptimized src={event.hasMedia ? `/api/events/${event.id}/media` : event.imagePath} alt={`${event.title} event preview`} fill priority sizes="100vw" />
        )}
        <div className="event-detail-shade" />
        <div className="event-detail-heading">
          <p className="eyebrow light"><span />{event.category}</p>
          <h1>{event.title}</h1>
        </div>
      </section>
      <section className="event-overview" aria-label="Event overview">
        <div className="event-overview-content">
          <div className="event-hero-details">
            <div><span>When</span><strong>{dateFormatter.format(event.startsAt)}</strong></div>
            <div><span>Where</span><strong>{event.location}</strong></div>
            <div><span>Cost</span><strong>{price}</strong></div>
            <div><span>Availability</span><strong>{publicAvailabilityLabel(event.capacity, event.spotsRemaining)}</strong></div>
          </div>

        </div>
      </section>

      <nav className="event-section-nav" aria-label="Event sections"><a href="#full-brief">Event brief</a><a href="#lineup">Confirmed models</a>{canViewAttendees && <a href="#photographers">Photographers</a>}{showTravel && <a href="#travel">Getting there</a>}<a href="#tickets">Purchase</a></nav>
      <section id="lineup" className="event-confirmed-models" aria-labelledby="confirmed-models-heading">
        <h2 id="confirmed-models-heading">Confirmed Models</h2>
        {!canViewAttendees && attendingModels.length > 0 ? <div className="event-locked-model-preview">
          <Image unoptimized src={`/api/events/${event.id}/model-preview`} alt="Blurred preview of attending models" width={1200} height={180} />
          <div><p>Sign in to see the models attending this event.</p><Link className="button" href={`/login?next=${encodeURIComponent(`/events/${event.slug}#lineup`)}`}>Sign in to view models →</Link></div>
        </div> : canViewAttendees ? <ConfirmedModelCarousel>{attendingModels.map((model) => <article key={model.memberId}>
          <MemberAvatarHoverCard name={model.name} role={model.role} location={model.location} href={`/members/${model.slug}`} imageSrc={model.avatarUpdatedAt ? `/api/members/${model.memberId}/avatar?v=${model.avatarUpdatedAt.getTime()}` : model.imagePath} online={model.isOnline} size={80} />
          <Link href={`/members/${model.slug}`} target="_blank" rel="noopener noreferrer">{model.name}</Link>
        </article>)}</ConfirmedModelCarousel> : null}{!attendingModels.length && <p className="confirmed-model-empty">Models will appear here as they join the event.</p>}
      </section>
      {canViewAttendees && <section id="photographers" className="event-confirmed-models" aria-labelledby="confirmed-photographers-heading">
        <h2 id="confirmed-photographers-heading">Confirmed Photographers</h2>
        <ConfirmedModelCarousel label="Confirmed photographers">{attendingPhotographers.map((photographer) => <article key={photographer.memberId}>
          <MemberAvatarHoverCard name={photographer.name} role={photographer.role} location={photographer.location} href={`/members/${photographer.slug}`} imageSrc={photographer.avatarUpdatedAt ? `/api/members/${photographer.memberId}/avatar?v=${photographer.avatarUpdatedAt.getTime()}` : photographer.imagePath} online={photographer.isOnline} size={80} />
          <Link href={`/members/${photographer.slug}`} target="_blank" rel="noopener noreferrer">{photographer.name}</Link>
        </article>)}</ConfirmedModelCarousel>
        {!attendingPhotographers.length && <p className="confirmed-model-empty">Photographers will appear here as they join the event.</p>}
      </section>}
      <section className="event-detail-layout" id="full-brief">
        <article className="event-detail-copy">
          <p className="eyebrow"><span />The brief</p>
          <h2>{event.introSentence || event.summary}</h2>
          {briefParagraphs.length > 0 && <div className="event-long-description">
            {briefParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>}

          <div className="event-participation-section" id="tickets">
            <h2>Purchase your place</h2>
            <div className="event-participation-grid">
              {participationPaths
                .filter((path) => path.enabled)
                .map((path) => {
                  const remaining = Math.max(
                    0,
                    path.capacity - (participationCounts[path.type] ?? 0),
                  );
                  const isDirectMemberPath = Boolean(
                    member &&
                    ["model", "photographer"].includes(member.primaryRole) &&
                    path.type === member.primaryRole,
                  );
                  const isCreativeAccount = member && ["model", "photographer"].includes(member.primaryRole);
                  const eligibleToPurchase = !member || (isCreativeAccount ? path.type === member.primaryRole : path.type === "attendee");
                  const pathPrice =
                    path.priceCents > 0
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(path.priceCents / 100)
                      : "Free";
                  return (
                    <article key={path.type}>
                      <span>{path.type.toUpperCase()}</span>
                      <h3>{path.title}</h3>
                      <p>{participationDescription(path)}</p>
                      <dl>
                        <div><dt>Price</dt><dd>{pathPrice}</dd></div>
                        <div><dt>Available</dt><dd>{publicAvailabilityLabel(path.capacity, remaining)}</dd></div>
                        <div><dt>Entry</dt><dd>{["model", "photographer", "attendee"].includes(path.type) ? "Direct checkout" : path.approvalRequired ? "Host approval" : "Instant"}</dd></div>
                      </dl>
                      {path.type === "sponsor" ? <Link className="button" href={`/sponsorships?event=${event.slug}`}>Request sponsorship →</Link> : !eligibleToPurchase ? <p className="path-account-note">{isCreativeAccount ? `Your ${member!.primaryRole} account books through the ${member!.primaryRole} option.` : `A ${path.title.toLowerCase()} account is required for this option.`}</p> : alreadyPaid ? paidNotice() : remaining > 0 ? (
                        <Link className="button" href={`/events/${event.slug}/join?path=${path.type}`}>
                          {path.priceCents > 0 ? `Purchase as ${path.title}` : `Join as ${path.title}`} ↗
                        </Link>
                      ) : (
                        <span className="path-full">Currently full</span>
                      )}
                    </article>
                  );
                })}
            </div>
          </div>

          <div className="event-list-columns">
            {event.shootTypes.length > 0 && (
              <div className="event-shoot-types">
                <h3>Shoot types</h3>
                <ul>{event.shootTypes.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
              </div>
            )}
            {event.included.length > 0 && <div className="event-inclusions">
              <h3>What’s included</h3>
              <ul>{event.included.map((item) => <li key={item}>✓ {item}</li>)}</ul>
            </div>}
            {(event.hotelAvailable || event.villaAvailable || event.accommodationDetails.length > 0) && <div className="event-accommodation-details">
              <h3>Accommodation options</h3>
              {event.accommodationDetails.length > 0 && <ul>{event.accommodationDetails.map((item, index) => { const split = item.indexOf(":"); return <li key={index}>{split > 0 ? <><strong>{item.slice(0, split)}:</strong>{item.slice(split + 1)}</> : item}{event.accommodationLinks[index] && <a className="accommodation-booking-link" href={event.accommodationLinks[index]} target="_blank" rel="noopener noreferrer">View accommodation &amp; book ↗<span className="sr-only"> (opens in a new tab)</span></a>}</li>; })}</ul>}
              {(event.hotelAvailable || event.villaAvailable) && <h4>Optional paid accommodation</h4>}
              <ul>
                {event.hotelAvailable && <li>Hotel accommodation · +{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(event.hotelPriceCents / 100)} · {[event.hotelModelsAllowed && "models", event.hotelPhotographersAllowed && "photographers"].filter(Boolean).join(" and ")}</li>}
                {event.villaAvailable && <li>Villa accommodation · {[event.villaModelsAllowed && `models +${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(event.villaModelPriceCents / 100)}`, event.villaPhotographersAllowed && `photographers +${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(event.villaPhotographerPriceCents / 100)}`].filter(Boolean).join(" · ")}</li>}
              </ul>
            </div>}
          </div>
          {showTravel && <section className="event-getting-there" id="travel" aria-labelledby="getting-there-heading">
            <h2 id="getting-there-heading">Getting there</h2>
            {event.passportRequired && <div className="event-passport-requirement">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 3.5 6.5V12c0 4.5 3.6 7.4 8.5 9 4.9-1.6 8.5-4.5 8.5-9V6.5L12 3Z" /><path d="m8 12 2.5 2.5L16 9" /></svg>
              <div><strong>Passport required</strong><p>Every traveler must bring a valid passport.</p></div>
            </div>}
            <EventFlightInstructions destination={isDestination} title={event.title} location={event.location} airportInfo={event.airportInfo} flightInstructions={event.flightInstructions} travelDetails={event.travelDetails} />
            {member && await eligibleFlightBooking(event.id, member.id) && <AttendeeFlightDetails eventId={event.id} timezone={event.travelDetails.timezone} />}
          </section>}
          {(event.showRefundNote || event.flightCostsExcluded) && <section className="event-default-notes" aria-labelledby="event-notes-heading"><h3 id="event-notes-heading">Event notes</h3><ul>
            {event.showRefundNote && <li><strong>{event.noRefunds ? "No refunds or credits are offered for this event." : `No refunds or credits are offered within ${event.refundDaysBefore} days of the event date.`}</strong></li>}
            {event.flightCostsExcluded && <li><strong>NOTE: Flight costs are not included.</strong></li>}
          </ul></section>}
        </article>

        <aside className="event-booking-card">
          <span>EVENT DETAILS</span>
          <dl>
            <div><dt>Location</dt><dd>{event.location}</dd></div>
            <div><dt>Starts</dt><dd>{dateFormatter.format(event.startsAt)}</dd></div>
            {event.endsAt && <div><dt>Ends</dt><dd>{dateFormatter.format(event.endsAt)}</dd></div>}
            <div><dt>Venue</dt><dd>{event.venue || event.location}</dd></div>
            <div><dt>Cost</dt><dd>{price}</dd></div>
            <div><dt>Availability</dt><dd>{publicAvailabilityLabel(event.capacity, event.spotsRemaining)}</dd></div>
          </dl>
          {alreadyPaid ? paidNotice() : memberParticipationPath ? <>
            <Link className="button" href={`/events/${event.slug}/join?path=${memberParticipationPath.type}`}>
              {memberParticipationPath.priceCents > 0 ? "Continue to payment" : `Join as ${memberParticipationPath.title}`} ↗
            </Link>
            <p>Your {memberParticipationPath.title.toLowerCase()} account uses the matching participation price and proceeds directly to checkout.</p>
          </> : participationPaths.some((path) => path.enabled && path.type === "attendee") ? <>
            <Link className="button" href={`/events/${event.slug}/join?path=attendee`}>Continue as a guest ↗</Link>
            <p>General attendees continue directly to secure payment. Confirmation and event details are sent by email.</p>
          </> : <>
            <Link className="button" href={`/signup?event=${event.slug}`}>Request a place ↗</Link>
            <p>Create a member account to request an available participation path.</p>
          </>}
          <div className="event-refund-policy">
            <strong>Refund policy</strong>
            {event.noRefunds ? (
              <p>Payments for this event are non-refundable.</p>
            ) : (
              <>
                <p>Full refunds are available until {event.refundDaysBefore} days before the event starts.</p>
                <p>Payments are non-refundable after that cutoff.</p>
              </>
            )}
            {event.refundTerms && <p>{event.refundTerms}</p>}
          </div>
        </aside>
      </section>

      <SiteFooter />
    </main>
  );
}
