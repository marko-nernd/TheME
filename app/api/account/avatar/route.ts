import { uploadAvatar } from "@/lib/avatar-upload";
import { avatarSettings, changeAvatarSource, removeAvatar } from "@/lib/avatar-source";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db";
import { members } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

export const runtime = "nodejs";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumUploadBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
 const member = await getCurrentMember();
 if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
 return uploadAvatar(request, member.id);
}
export async function GET() {
 const member = await getCurrentMember();
 if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
 return avatarSettings(member.id);
}
export async function PATCH(request: Request) {
 const member = await getCurrentMember();
 if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
 return changeAvatarSource(request, member.id);
}
export async function DELETE() {
 const member = await getCurrentMember();
 if (!member?.emailVerifiedAt) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
 return removeAvatar(member.id);
}
