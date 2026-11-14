import { redirect, notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getEventBySlug, getMemberPaidEventParticipation } from "@/db/queries";
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { defaultParticipationPaths } from "@/lib/participation";
import { isGuestOnlyEventRole } from "@/lib/roles";
import JoinEventForm from "./join-event-form";
import { eventCustomerCheckoutCents } from "@/lib/platform-fees";

export const dynamic = "force-dynamic";

export default async function JoinEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { slug } = await params;
  const member = await getCurrentMember();
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  const paidParticipation = member
    ? await getMemberPaidEventParticipation(event.id, member.id)
    : null;
  const paths = event.participationPaths.length
    ? event.participationPaths
    : defaultParticipationPaths;
  const requestedPath = (await searchParams).path;
  const guestOnlyAccount = isGuestOnlyEventRole(member?.primaryRole);
  const guestCheckout = requestedPath === "attendee" || guestOnlyAccount;
  if (!guestCheckout && !member?.emailVerifiedAt) {
    redirect(`/login?next=${encodeURIComponent(`/events/${slug}/join${requestedPath ? `?path=${requestedPath}` : ""}`)}`);
  }
  const directRolePath = Boolean(member && ["model", "photographer"].includes(member.primaryRole));
  const path = guestOnlyAccount
    ? paths.find((candidate) => candidate.enabled && candidate.type === "attendee")
    : directRolePath
    ? paths.find((candidate) => candidate.enabled && candidate.type === member!.primaryRole)
    : paths.find((candidate) => candidate.enabled && candidate.type === requestedPath) ??
      paths.find((candidate) => candidate.enabled);
  if (!path) notFound();

  if (paidParticipation) {
    return (
      <main className="join-event-page">
        <SiteHeader inner />
        <section className="join-event-confirmation event-payment-complete">
          <p className="eyebrow"><span />Payment complete</p>
          <h1>You’re already confirmed.</h1>
          <p>Your {paidParticipation.pathType} payment for {event.title} has already been received. No additional payment is needed.</p>
          <div>
            <Link className="button" href={`/receipts/events/${paidParticipation.transactionId}`}>View transaction details ↗</Link>
            <Link className="quiet-dark-link" href={`/events/${event.slug}`}>Return to event →</Link>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="join-event-page">
      <SiteHeader inner />
      <section className="wizard-intro" id="top">
        <p className="eyebrow light"><span />{path.type === "attendee" ? "General attendee" : path.type} participation</p>
        <h1>Book your place.<br /><em>{event.title}</em></h1>
        <p>
          {path.type === "attendee"
            ? "Enter your contact information and continue directly to secure payment. Your confirmation and event details will be emailed after payment."
            : directRolePath
            ? "Check your details, choose an optional stay, and review the total before paying."
            : "Confirm your participation details. Paid paths continue directly to secure payment."}
        </p>
      </section>
      <JoinEventForm
        publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
        checkoutQuotes={{ none: eventCustomerCheckoutCents(path.priceCents), hotel: eventCustomerCheckoutCents(path.priceCents + event.hotelPriceCents), villa: eventCustomerCheckoutCents(path.priceCents + (path.type === "photographer" ? event.villaPhotographerPriceCents : event.villaModelPriceCents)) }}
        event={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          hotelAvailable: event.hotelAvailable,
          hotelPriceCents: event.hotelPriceCents,
          hotelModelsAllowed: event.hotelModelsAllowed,
          hotelPhotographersAllowed: event.hotelPhotographersAllowed,
          villaAvailable: event.villaAvailable,
          villaPriceCents: event.villaPriceCents,
          villaModelPriceCents: event.villaModelPriceCents,
          villaPhotographerPriceCents: event.villaPhotographerPriceCents,
          villaModelSpots: event.villaModelSpots,
          villaPhotographerSpots: event.villaPhotographerSpots,
          villaModelsAllowed: event.villaModelsAllowed,
          villaPhotographersAllowed: event.villaPhotographersAllowed,
        }}
        member={member ? { name: member.name, email: member.email, role: member.primaryRole } : null}
        path={path}
      />
      <SiteFooter />
    </main>
  );
}
