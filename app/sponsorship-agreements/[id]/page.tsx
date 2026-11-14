import { and, eq, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { events, sponsors, sponsorshipAgreements, sponsorshipRequests } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import SponsorshipAgreementForm from "@/components/sponsorship-agreement-form";

export default async function SponsorshipAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember(); const { id } = await params; if (!member) redirect(`/login?next=/sponsorship-agreements/${id}`);
  const [record] = await db.select({ id: sponsorshipAgreements.id, terms: sponsorshipAgreements.terms, status: sponsorshipAgreements.status, cashAmountCents: sponsorshipAgreements.cashAmountCents, contributionType: sponsorshipAgreements.contributionType, paymentStatus: sponsorshipAgreements.paymentStatus, inKindStatus: sponsorshipAgreements.inKindStatus, fulfillmentNotes: sponsorshipAgreements.fulfillmentNotes, organizerAcceptedAt: sponsorshipAgreements.organizerAcceptedAt, sponsorAcceptedAt: sponsorshipAgreements.sponsorAcceptedAt, beneficiaryAcceptedAt: sponsorshipAgreements.beneficiaryAcceptedAt, organizerMemberId: sponsorshipAgreements.organizerMemberId, sponsorMemberId: sponsorshipAgreements.sponsorMemberId, beneficiaryMemberId: sponsorshipAgreements.beneficiaryMemberId, eventTitle: events.title, sponsorName: sponsors.name })
    .from(sponsorshipAgreements).innerJoin(sponsorshipRequests, eq(sponsorshipRequests.id, sponsorshipAgreements.requestId)).innerJoin(events, eq(events.id, sponsorshipRequests.eventId)).innerJoin(sponsors, eq(sponsors.id, sponsorshipRequests.sponsorId))
    .where(and(eq(sponsorshipAgreements.id, id), or(eq(sponsorshipAgreements.organizerMemberId, member.id), eq(sponsorshipAgreements.sponsorMemberId, member.id), eq(sponsorshipAgreements.beneficiaryMemberId, member.id)))).limit(1);
  if (!record) notFound();
  return <main><SiteHeader inner /><section className="agreement-page"><p className="eyebrow light"><span />Accepted sponsorship</p><h1>{record.eventTitle}<br /><em>{record.sponsorName}</em></h1><SponsorshipAgreementForm agreement={{ ...record, cashAmount: new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(record.cashAmountCents/100), organizerAccepted: Boolean(record.organizerAcceptedAt), sponsorAccepted: Boolean(record.sponsorAcceptedAt), beneficiaryAccepted: Boolean(record.beneficiaryAcceptedAt), beneficiaryRequired: Boolean(record.beneficiaryMemberId), isOrganizer: record.organizerMemberId === member.id, isSponsor: record.sponsorMemberId === member.id, isBeneficiary: record.beneficiaryMemberId === member.id, publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "" }} /></section><SiteFooter /></main>;
}
