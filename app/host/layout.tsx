import type { CSSProperties, ReactNode } from "react";
import { getSitePageSettings } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function HostLayout({ children }: { children: ReactNode }) {
  const page = await getSitePageSettings("host");
  return <div style={{ "--page-header-color": page.headerBackgroundColor } as CSSProperties}>{children}</div>;
}
