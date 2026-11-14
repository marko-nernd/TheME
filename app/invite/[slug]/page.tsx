import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BackButton from "@/components/back-button";
import EventInviteForm from "@/components/event-invite-form";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getHostedEvents, getInviteCooldowns, getProfileBySlug } from "@/db/queries";
import { getCurrentMember } from "@/lib/auth";
import { isHostRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function InviteMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [member, target] = await Promise.all([getCurrentMember(), getProfileBySlug(slug)]);
  if (!target?.profile.memberId) notFound();
  if (!member?.emailVerifiedAt) redirect(`/login?next=/invite/${slug}`);
  if (!isHostRole(member.primaryRole)) {
    redirect(`/members/${slug}`);
  }
  const [hostedEvents, cooldowns] = await Promise.all([
    getHostedEvents(member.id),
    getInviteCooldowns(member.id, target.profile.memberId),
  ]);

  return (
    <main>
      <SiteHeader inner />
      <BackButton fallback={`/members/${slug}`} />
      <section className="invite-member-page">
        <div className="invite-member-summary">
          <p className="eyebrow light"><span />Direct event invitation</p>
          <Image
            unoptimized
            src={
              target.avatarUpdatedAt
                ? `/api/members/${target.profile.memberId}/avatar?v=${target.avatarUpdatedAt.getTime()}`
                : target.profile.imagePath
            }
            alt={`${target.profile.name} profile`}
            width={110}
            height={110}
          />
          <h1>Invite<br /><em>{target.profile.name}.</em></h1>
          <p>
            Select an event you own. The invitation will appear in their
            dashboard with a direct link to the event.
          </p>
          <Link href={`/members/${slug}`}>View their full profile ↗</Link>
        </div>
        <div className="invite-member-workspace">
          {hostedEvents.length ? (
            <EventInviteForm
              recipientMemberId={target.profile.memberId}
              recipientName={target.profile.name}
              events={hostedEvents}
              cooldowns={cooldowns.flatMap((item) =>
                item.eventId ? [{ eventId: item.eventId, retryAt: item.retryAt.toISOString() }] : [],
              )}
            />
          ) : (
            <div className="invite-empty">
              <span>NO EVENTS YET</span>
              <h2>Create an event before sending an invitation.</h2>
              <Link className="button" href={`/host/new?invite=${slug}`}>Create an event ↗</Link>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
