import Link from "next/link";
import { redirect } from "next/navigation";
import ModelPreviewCard from "@/components/model-preview-card";
import PublicDirectoryShell from "@/components/public-directory-shell";
import { getPaginatedModels, getSitePageSettings } from "@/db/queries";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const page = await getSitePageSettings("models");
  return { title: page.seoTitle || page.title, description: page.seoDescription || page.intro, openGraph: { images: [page.shareImagePath || page.imagePath] } };
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const rawPage = Number((await searchParams).page ?? "1");
  const requestedPage = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const data = await getPaginatedModels(requestedPage, 12);
  const settings = await getSitePageSettings("models");
  if (data.total && requestedPage > data.pageCount) redirect(`/models?page=${data.pageCount}`);

  return (
    <PublicDirectoryShell
      active="models"
      eyebrow={settings.eyebrow}
      title={settings.title}
      intro={settings.intro}
      image={settings.imagePath || "/images/models/model-08.jpg"}
      count={data.total}
      countLabel="reviewed models"
      actionLabel="Create a Model profile"
      actionHref="/signup"
      headerBackgroundColor={settings.headerBackgroundColor}
    >
      <section className="public-directory-content model-directory-section" id="model-directory">
        <div className="public-directory-toolbar compact">
          <div>
            <p className="eyebrow"><span />Model directory</p>
            <h2>Available faces. Clear profiles.</h2>
          </div>
          <nav className="public-filter-pills" aria-label="Creative directories">
            <Link className="is-active" href="/models">Models</Link>
            <Link href="/photographers">Photographers</Link>
          </nav>
        </div>
        <div className="full-model-grid">
          {data.profiles.map((profile) => (
            <ModelPreviewCard
              variant="directory"
              key={profile.id}
              model={{
                slug: profile.slug,
                name: profile.name,
                role: "Model",
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
        <nav className="pagination" aria-label="Model directory pages">
          {data.page > 1 ? <Link scroll={false} href={`/models?page=${data.page - 1}`}>← Previous</Link> : <span />}
          <div>
            {Array.from({ length: data.pageCount }, (_, index) => index + 1).map((page) => (
              <Link
                href={`/models?page=${page}`}
                scroll={false}
                className={page === data.page ? "current" : ""}
                aria-current={page === data.page ? "page" : undefined}
                key={page}
              >
                {page}
              </Link>
            ))}
          </div>
          {data.page < data.pageCount ? <Link scroll={false} href={`/models?page=${data.page + 1}`}>Next →</Link> : <span />}
        </nav>
      </section>
    </PublicDirectoryShell>
  );
}
