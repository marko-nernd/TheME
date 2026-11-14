import Link from "next/link";
import ModelPreviewCard from "@/components/model-preview-card";
import PublicDirectoryShell from "@/components/public-directory-shell";
import { getPublishedProfiles, getSitePageSettings } from "@/db/queries";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const page = await getSitePageSettings("discover");
  return { title: page.seoTitle || page.title, description: page.seoDescription || page.intro, openGraph: { images: [page.shareImagePath || page.imagePath] } };
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const page = await getSitePageSettings("discover");
  const selectedRole = (await searchParams).role;
  let profiles: Awaited<ReturnType<typeof getPublishedProfiles>> = [];
  try { profiles = await getPublishedProfiles(); } catch { /* Local fallback below. */ }
  const models = profiles.filter((profile) => profile.role === "model");
  const photographers = profiles.filter((profile) => profile.role === "photographer");
  const visibleProfiles = selectedRole === "model" || selectedRole === "photographer"
    ? profiles.filter((profile) => profile.role === selectedRole)
    : profiles;
  return (
    <PublicDirectoryShell
      active="discover"
      eyebrow={page.eyebrow}
      title={page.title}
      intro={page.intro}
      image={page.imagePath || "/images/daisy.jpg"}
      count={profiles.length}
      countLabel="reviewed creatives"
      actionLabel="Apply to join"
      actionHref="/signup"
      headerBackgroundColor={page.headerBackgroundColor}
    >
      <section className="public-directory-content">
        <div className="discover-role-panels">
          <Link href="/models"><span>01 / Talent</span><strong>Models</strong><small>{models.length} reviewed profiles</small><b>Browse models →</b></Link>
          <Link href="/photographers"><span>02 / Image makers</span><strong>Photographers</strong><small>{photographers.length} reviewed profiles</small><b>Browse photographers →</b></Link>
        </div>
        <div className="public-directory-toolbar compact">
          <div>
            <p className="eyebrow"><span />Member directory</p>
            <h2>People ready to make the work.</h2>
          </div>
          <nav className="public-filter-pills" aria-label="Member filters">
            <Link className={!selectedRole ? "is-active" : ""} href="/discover">Everyone</Link>
            <Link className={selectedRole === "model" ? "is-active" : ""} href="/discover?role=model">Models</Link>
            <Link className={selectedRole === "photographer" ? "is-active" : ""} href="/discover?role=photographer">Photographers</Link>
          </nav>
        </div>
        <div className="profile-directory">
          {visibleProfiles.map((profile) => (
            <ModelPreviewCard
              variant="directory"
              key={profile.id}
              model={{
                slug: profile.slug,
                name: profile.name,
                role: profile.role,
                location: profile.location,
                image: profile.imagePath,
                available: profile.isAvailable,
                tier: profile.membershipTier,
                bio: profile.bio,
                experienceYears: profile.experienceYears,
                specialties: profile.specialties,
                isPremiumBlur: profile.isPremiumBlur,
              }}
            />
          ))}
        </div>
        {visibleProfiles.length === 0 && <div className="public-empty-state"><span>00</span><h3>No matching profiles yet.</h3><p>Approved public profiles will appear here automatically.</p></div>}
      </section>
    </PublicDirectoryShell>
  );
}
