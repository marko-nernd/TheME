import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [member] = await db
    .select({
      data: members.avatarData,
      source: members.avatarSource,
      social: members.socialAvatarData,
      mime: members.avatarMime,
      updatedAt: members.avatarUpdatedAt,
    })
    .from(members)
    .where(eq(members.id, id))
    .limit(1);
  const image = member?.source === "social" ? member.social : member?.data;
  const mime = member?.source === "social" ? "image/webp" : member?.mime;
  if (!image || !mime) {
    return new Response(null, { status: 404 });
  }
  return new Response(new Uint8Array(image), {
    headers: {
      "content-type": mime,
      "content-length": String(image.length),
      "cache-control": "public, max-age=31536000, immutable",
      "last-modified": (member.updatedAt ?? new Date()).toUTCString(),
    },
  });
}
