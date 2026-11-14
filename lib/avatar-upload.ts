import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db";
import { members } from "@/db/schema";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumUploadBytes = 8 * 1024 * 1024;

export async function uploadAvatar(request: Request, memberId: string) {
  try {
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image." }, { status: 400 });
    }
    if (!acceptedTypes.has(file.type) || file.size < 1 || file.size > maximumUploadBytes) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WebP image no larger than 8 MB." },
        { status: 400 },
      );
    }

    const source = Buffer.from(await file.arrayBuffer());
    const pipeline = sharp(source, {
      failOn: "error",
      limitInputPixels: 25_000_000,
    }).rotate();
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: "The image could not be read." }, { status: 400 });
    }

    const avatarData = await pipeline
      .resize(500, 500, {
        fit: "cover",
        position: "attention",
        withoutEnlargement: false,
      })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();
    const avatarUpdatedAt = new Date();

    await db
      .update(members)
      .set({
        avatarSource: "upload",
        avatarData,
        avatarMime: "image/webp",
        avatarUpdatedAt,
        updatedAt: avatarUpdatedAt,
      })
      .where(eq(members.id, memberId));

    return NextResponse.json({
      ok: true,
      version: avatarUpdatedAt.getTime(),
      width: 500,
      height: 500,
    });
  } catch (error) {
    console.error("Avatar upload failed", error);
    return NextResponse.json(
      { error: "The image could not be processed. Try another JPG, PNG, or WebP." },
      { status: 400 },
    );
  }
}

