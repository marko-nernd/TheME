import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { isHostRole } from "@/lib/roles";
import {
  getEventProposalsForMember,
  getHostedEvents,
  getHostedParticipationRequests,
  getSponsorForMember,
  getSponsoredEventsForMember,
  getSponsorshipRequestsForMember,
} from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const role = isHostRole(member.primaryRole) ? "host" : member.primaryRole;

  if (role === "host") {
    const [events, proposals, participants] = await Promise.all([
      getHostedEvents(member.id),
      getEventProposalsForMember(member.id),
      getHostedParticipationRequests(member.id),
    ]);
    return NextResponse.json({
      role,
      host: {
        events: events.map((event) => ({
          id: event.id,
          title: event.title,
          location: event.location,
          startsAt: event.startsAt.toISOString(),
          imagePath: event.hasMedia ? `/api/events/${event.id}/media` : event.imagePath,
          posterPath: event.hasPoster ? `/api/events/${event.id}/media?poster=1` : event.imagePath,
        })),
        proposals: proposals.map((proposal) => ({
          ...proposal,
          updatedAt: proposal.updatedAt.toISOString(),
        })),
        participants: participants.map((participant) => ({
          ...participant,
          eventStartsAt: participant.eventStartsAt.toISOString(),
          applicantImage: participant.applicantAvatarUpdatedAt
            ? `/api/members/${participant.applicantMemberId}/avatar?v=${participant.applicantAvatarUpdatedAt.getTime()}`
            : participant.applicantProfileSlug && participant.applicantImagePath
              ? `/api/mobile/models/${participant.applicantProfileSlug}/image`
              : null,
          createdAt: participant.createdAt.toISOString(),
        })),
      },
      sponsor: null,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  if (role === "sponsor") {
    const [company, requests, sponsoredEvents] = await Promise.all([
      getSponsorForMember(member.id),
      getSponsorshipRequestsForMember(member.id),
      getSponsoredEventsForMember(member.id),
    ]);
    return NextResponse.json({
      role,
      host: null,
      sponsor: {
        company: company ? {
          id: company.id,
          name: company.name,
          category: company.category,
          sponsorLevel: company.sponsorLevel,
          logo: company.hasLogoUpload ? `/api/sponsors/${company.id}/logo` : company.logoPath,
          location: company.location,
        } : null,
        requests: requests.map((request) => ({
          ...request,
          createdAt: request.createdAt.toISOString(),
        })),
        sponsoredEvents: sponsoredEvents.map((event) => ({
          ...event,
          startsAt: event.startsAt.toISOString(),
        })),
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  return NextResponse.json({ role, host: null, sponsor: null }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
