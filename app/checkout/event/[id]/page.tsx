import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { db } from "@/db";
import { eventParticipations, events } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import EventPaymentElement from "./payment-element";
import { eventCustomerCheckoutCents } from "@/lib/platform-fees";
import { hashToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function EventCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const member = await getCurrentMember();
  const { id } = await params;
  const guestToken = (await searchParams).token ?? "";
  const [participation] = await db
    .select({
      id: eventParticipations.id,
      memberId: eventParticipations.memberId,
      guestAccessTokenHash: eventParticipations.guestAccessTokenHash,
      status: eventParticipations.status,
      pathType: eventParticipations.pathType,
      priceCents: eventParticipations.priceCents,
      accommodationType: eventParticipations.accommodationType,
      accommodationPriceCents: eventParticipations.accommodationPriceCents,
      eventTitle: events.title,
      eventSlug: events.slug,
      startsAt: events.startsAt,
      location: events.location,
      city: events.city,
      state: events.stateCode,
    })
    .from(eventParticipations)
    .innerJoin(events, eq(eventParticipations.eventId, events.id))
    .where(eq(eventParticipations.id, id))
    .limit(1);
  if (!participation) notFound();
  const memberAuthorized = Boolean(member?.emailVerifiedAt && participation.memberId === member.id);
  const guestAuthorized = Boolean(!participation.memberId && guestToken && participation.guestAccessTokenHash === hashToken(guestToken));
  if (!memberAuthorized && !guestAuthorized) {
    if (participation.memberId) redirect(`/login?next=${encodeURIComponent(`/checkout/event/${id}`)}`);
    notFound();
  }
  if (participation.status === "confirmed") redirect(`/passes/${participation.id}${guestAuthorized ? `?token=${encodeURIComponent(guestToken)}` : ""}`);
  if (!["approved", "awaiting_payment"].includes(participation.status)) {
    redirect(`/events/${participation.eventSlug}`);
  }
  const checkout = eventCustomerCheckoutCents(participation.priceCents);

  return (
    <main className="embedded-checkout-page">
      <SiteHeader inner />
      <section className="embedded-checkout-heading event-payment-heading" id="top">
        <div>
          <p className="eyebrow light"><span />Secure event checkout</p>
          <h1>Complete your<br /><em>event payment.</em></h1>
        </div>
        <div className="checkout-order-summary">
          <span>{participation.pathType === "attendee" ? "General attendee" : participation.pathType} participation</span>
          <dl className="event-checkout-breakdown">
            <div><dt>Event price</dt><dd>{money.format((checkout.baseAmountCents - participation.accommodationPriceCents) / 100)}</dd></div>
            {participation.accommodationPriceCents > 0 && <div><dt>{participation.accommodationType === "villa" ? "Villa" : "Hotel"} accommodation</dt><dd>{money.format(participation.accommodationPriceCents / 100)}</dd></div>}
            <div><dt>Service fee</dt><dd>{money.format(checkout.customerFeeCents / 100)}</dd></div>
            <div><dt>Total due</dt><dd>{money.format(checkout.totalCents / 100)}</dd></div>
          </dl>
          <small>{participation.eventTitle}</small>
          <small>{participation.startsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {participation.city ? `${participation.city}${participation.state ? `, ${participation.state}` : ""}` : participation.location}</small>
          <Link href={`/events/${participation.eventSlug}`}>← Back to event</Link>
        </div>
      </section>
      <section className="payment-element-shell">
        <div className="payment-element-intro">
          <p className="eyebrow"><span />Stripe test mode</p>
          <h2>Payment details</h2>
          <p>Use a Stripe test card. Your payment details are sent directly to Stripe and are not stored by Model Escape.</p>
        </div>
        <EventPaymentElement
          participationId={participation.id}
          guestToken={guestAuthorized ? guestToken : undefined}
          successHref={guestAuthorized ? `/events/${participation.eventSlug}?payment=success` : "/dashboard"}
          publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
