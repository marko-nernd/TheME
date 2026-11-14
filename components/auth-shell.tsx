import type { ReactNode } from "react";
import Link from "next/link";
import SiteHeader from "./site-header";

export default function AuthShell({
  eyebrow,
  title,
  intro,
  children,
  centered = false,
  variant = "default",
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  centered?: boolean;
  variant?: "default" | "signin";
}) {
  return (
    <main className={`auth-page${centered ? " auth-page-centered" : ""}${variant === "signin" ? " auth-page-signin" : ""}`}>
      <SiteHeader inner />
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow light"><span />{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <Link href="/" className="quiet-link">← Back home</Link>
        </div>
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
