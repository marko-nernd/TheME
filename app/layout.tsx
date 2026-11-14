import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/montserrat/wght-italic.css";
import "./globals.css";
import "./dark-theme.css";
import "./cinematic.css";
import "./admin-ux.css";
import "./event-travel.css";
import "./platform-ux.css";
import SiteBrandingRuntime from "@/components/site-branding-runtime";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
  title: "Model Escape — Creative Escapes for Models & Photographers",
  description: "A private creative network for curated destination shoots, trusted collaborators, and portfolio-defining work.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Model Escape",
    description: "Make work worth escaping for.",
    images: [{ url: "/og.png", width: 1915, height: 948, alt: "Model Escape — Make work worth escaping for." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Escape",
    description: "Make work worth escaping for.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-site-theme="dark">
      <body className="platform-ui"><SiteBrandingRuntime />{children}</body>
    </html>
  );
}
