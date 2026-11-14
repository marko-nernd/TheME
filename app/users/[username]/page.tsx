import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/back-button";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getPublicMemberByUsername } from "@/db/queries";
import { primaryRoleLabel } from "@/lib/roles";
import { memberPlaceholder } from "@/lib/member-placeholder";

export const dynamic = "force-dynamic";

export default async function PublicUserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const member = await getPublicMemberByUsername((await params).username);
  if (!member) notFound();
  if (member.profileSlug) {
    return (
      <main>
        <SiteHeader inner />
        <section className="generic-profile-redirect">
          <h1>{member.name}</h1>
          <Link className="button" href={`/members/${member.profileSlug}`}>Open creative profile ↗</Link>
        </section>
      </main>
    );
  }
  if (member.primaryRole === "sponsor") {
    return <main><SiteHeader inner /><BackButton fallback="/sponsorships" />
      <section className="sponsor-public-profile">
        <div className="sponsor-public-avatar">
          {member.avatarUpdatedAt ? <Image unoptimized src={`/api/members/${member.id}/avatar?v=${member.avatarUpdatedAt.getTime()}`} alt={`${member.name} profile photo`} width={132} height={132} /> : <Image unoptimized src={memberPlaceholder(member.primaryRole)} alt="Sponsor placeholder" width={132} height={132} />}
          {member.isOnline && <i aria-label="Online now" title="Online now" />}
          {member.isVerified && <b className="verified-image-badge" aria-label="Identity verified">✓</b>}
        </div>
        <div><p className="eyebrow light"><span />Sponsor profile</p><h1>{member.name}</h1><p>{member.bio || `${member.name} is building their Model Escape presence.`}</p>
          <dl><div><dt>Location</dt><dd>{member.homeMarket}</dd></div>{member.organization && <div><dt>Organization</dt><dd>{member.organization}</dd></div>}<div><dt>Status</dt><dd>{member.isOnline ? "Online now" : "Offline"}</dd></div></dl>
          {member.websiteUrl && <a className="button button-light" href={member.websiteUrl} target="_blank" rel="noreferrer">Visit website ↗</a>}
        </div>
      </section><SiteFooter /></main>;
  }
  return (
    <main>
      <SiteHeader inner />
      <BackButton fallback="/discover" />
      <section className="generic-profile-page">
        <div>
          <p className="eyebrow light"><span />{primaryRoleLabel(member.primaryRole)} profile</p>
          <h1>{member.name}</h1>
          <p>{member.bio || `${member.name} is building their Model Escape presence.`}</p>
          <dl>
            <div><dt>Home market</dt><dd>{member.homeMarket}</dd></div>
            {member.organization && <div><dt>Organization</dt><dd>{member.organization}</dd></div>}
            <div><dt>Status</dt><dd>{member.isOnline ? "Online now" : "Offline"}</dd></div>
          </dl>
          {member.websiteUrl && <a className="button button-light" href={member.websiteUrl} target="_blank" rel="noreferrer">Visit website ↗</a>}
        </div>
        <div className="generic-profile-photo">
          {member.avatarUpdatedAt ? (
            <Image
              unoptimized
              src={`/api/members/${member.id}/avatar?v=${member.avatarUpdatedAt.getTime()}`}
              alt={`${member.name} profile photo`}
              fill
              priority
              sizes="(max-width: 800px) 100vw, 45vw"
            />
          ) : member.profileImagePath ? (
            <Image unoptimized src={member.profileImagePath} alt={`${member.name} profile photo`} fill priority />
          ) : <Image unoptimized src={memberPlaceholder(member.primaryRole)} alt={`${primaryRoleLabel(member.primaryRole)} placeholder`} fill priority />}
          {member.isOnline && <i aria-label="Online now" title="Online now" />}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
