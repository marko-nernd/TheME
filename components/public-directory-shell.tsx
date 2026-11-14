import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";

type DirectorySection = "events" | "discover" | "models" | "photographers";

const directoryLinks: Array<{ key: DirectorySection; label: string; eyebrow: string; href: string }> = [
  { key: "events", label: "Events", eyebrow: "Find the production", href: "/events" },
  { key: "discover", label: "Discover", eyebrow: "Browse the network", href: "/discover" },
  { key: "models", label: "Models", eyebrow: "Find talent", href: "/models" },
  { key: "photographers", label: "Photographers", eyebrow: "Find the eye", href: "/photographers" },
];

export default function PublicDirectoryShell({
  active,
  eyebrow,
  title,
  intro,
  image,
  count,
  countLabel,
  actionLabel,
  actionHref,
  headerBackgroundColor,
  children,
}: {
  active: DirectorySection;
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  count: number;
  countLabel: string;
  actionLabel: string;
  actionHref: string;
  headerBackgroundColor?: string;
  children: ReactNode;
}) {
  return (
    <main className="public-directory-page">
      <SiteHeader inner backgroundColor={headerBackgroundColor} />
      <section className="public-directory-hero" id="top">
        <Image unoptimized src={image} alt="" fill priority sizes="100vw" />
        <div className="public-directory-hero-shade" />
        <div className="public-directory-hero-copy">
          <p className="eyebrow light"><span />{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <div className="public-directory-actions">
            <Link className="button public-primary-button" href={actionHref}>{actionLabel} <b>↗</b></Link>
            <span><strong>{count}</strong>{countLabel}</span>
          </div>
        </div>
        <nav className="public-directory-switcher" aria-label="Explore Model Escape">
          {directoryLinks.map((link, index) => (
            <Link className={active === link.key ? "is-active" : ""} href={link.href} aria-current={active === link.key ? "page" : undefined} key={link.key}>
              <span>0{index + 1}</span>
              <small>{link.eyebrow}</small>
              <strong>{link.label}</strong>
              <b aria-hidden="true">↗</b>
            </Link>
          ))}
        </nav>
      </section>
      {children}
      <SiteFooter />
    </main>
  );
}
