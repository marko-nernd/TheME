import { NextResponse } from "next/server";
import { getSiteBranding } from "@/lib/site-branding";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSiteBranding(), {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=300" },
  });
}
