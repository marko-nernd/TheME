import Link from "next/link";
import { redirect } from "next/navigation";
import ModelPreviewCard from "@/components/model-preview-card";
import PublicDirectoryShell from "@/components/public-directory-shell";
import { getPaginatedPhotographers, getSitePageSettings } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await getSitePageSettings("photographers");
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.intro,
    openGraph: { images: [page.shareImagePath || page.imagePath] },
  };
}

export default async function PhotographersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const rawPage = Number((await searchParams).page ?? "1");
  const requestedPage = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const [data, settings] = await Promise.all([
    getPaginatedPhotographers(requestedPage, 12),
    getSitePageSettings("photographers"),
  ]);
  if (data.total && requestedPage > data.pageCount) redirect(`/photographers?page=${data.pageCount}`);

  return (
    <PublicDirectoryShell
      active="photographers"
      eyebrow={settings.eyebrow}
      title={settings.title}
      intro={settings.intro}
      image={settings.imagePath || "/images/neon-studio.png"}
      count={data.total}
      countLabel="reviewed photographers"
      actionLabel="Create a Photographer profile"
      actionHref="/signup"
      headerBackgroundColor={settings.headerBackgroundColor}
    >
      <section className="public-directory-content" id="photographer-directory">
        <div className="public-directory-toolbar compact">
          <div>
            <p className="eyebrow"><span />Photographer directory</p>
            <h2>Find a style that fits the brief.</h2>
          </div>
          <nav className="public-filter-pills" aria-label="Creative directories">
            <Link href="/models">Models</Link>
            <Link className="is-active" href="/photographers">Photographers</Link>
          </nav>
        </div>
        <div className="full-model-grid public-photographer-grid">
          {data.profiles.map((profile) => (
            <ModelPreviewCard
              variant="directory"
              key={profile.id}
              model={{
                slug: profile.slug,
                name: profile.name,
                role: "Photographer",
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
        {data.profiles.length === 0 && (
          <div className="public-empty-state">
            <span>00</span>
            <h3>Photographer profiles are being reviewed.</h3>
            <p>Approved photographers will appear here automatically.</p>
          </div>
        )}
        {data.pageCount > 1 && (
          <nav className="pagination" aria-label="Photographer directory pages">
            {data.page > 1 ? <Link scroll={false} href={`/photographers?page=${data.page - 1}`}>← Previous</Link> : <span />}
            <div>
              {Array.from({ length: data.pageCount }, (_, index) => index + 1).map((page) => (
                <Link
                  href={`/photographers?page=${page}`}
                  scroll={false}
                  className={page === data.page ? "current" : ""}
                  aria-current={page === data.page ? "page" : undefined}
                  key={page}
                >
                  {page}
                </Link>
              ))}
            </div>
            {data.page < data.pageCount ? <Link scroll={false} href={`/photographers?page=${data.page + 1}`}>Next →</Link> : <span />}
          </nav>
        )}
      </section>
    </PublicDirectoryShell>
  );
}
