import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { siteMediaAssets } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const [asset] = await db.select({ data: siteMediaAssets.data, mimeType: siteMediaAssets.mimeType }).from(siteMediaAssets).where(eq(siteMediaAssets.id, id)).limit(1);
  if (!asset) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(asset.data), {
    headers: { "content-type": asset.mimeType, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
