import { NextResponse } from "next/server";
import { getProfileBySlug } from "@/db/queries";
import { loadModelImage, modelImageResponse } from "@/lib/mobile-model-media";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const data = await getProfileBySlug((await params).slug);
    if (!data || data.profile.role !== "photographer") return new NextResponse(null, { status: 404 });
    const source = await loadModelImage(request, data.profile.imagePath, data.profile.coverData);
    return modelImageResponse(source, data.profile.isPremiumBlur, data.profile.coverMime || "image/jpeg");
  } catch (error) {
    console.error("Unable to load mobile photographer image", error);
    return new NextResponse(null, { status: 404 });
  }
}
