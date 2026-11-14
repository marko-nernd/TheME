import type { ReactNode } from "react";
import PageHero from "./page-hero";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";

export default function PageShell({ eyebrow, title, intro, image, headerBackgroundColor, className, children }: { eyebrow: string; title: string; intro: string; image?: string; headerBackgroundColor?: string; className?: string; children: ReactNode }) {
  return <main className={className}><SiteHeader inner backgroundColor={headerBackgroundColor} /><PageHero eyebrow={eyebrow} title={title} intro={intro} image={image} />{children}<SiteFooter /></main>;
}
