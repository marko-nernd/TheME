import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, members } from "@/db/schema";
import { getEventAttendingModels } from "@/db/queries";
import { uuidPattern } from "@/lib/event-pass";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 if (!uuidPattern.test(id)) return new Response(null, { status: 404 });
 const [event] = await db.select({ id: events.id }).from(events).where(and(eq(events.id,id),eq(events.isPublished,true))).limit(1);
 if (!event) return new Response(null, { status: 404 });
 const models = (await getEventAttendingModels(id)).slice(0,8);
 if (!models.length) return new Response(null, { status: 404 });
 const rows = await db.select({ id: members.id, source: members.avatarSource, upload: members.avatarData, social: members.socialAvatarData }).from(members).where(inArray(members.id, models.map((model) => model.memberId)));
 const publicRoot = path.resolve(process.cwd(), "public");
 const fallback = await readFile(path.join(publicRoot,"images/placeholders/model_placeholder.png"));
 const tiles = await Promise.all(models.map(async (model,index) => {
  const row = rows.find((member) => member.id === model.memberId);
  let input = row?.source === "social" ? row.social : row?.upload;
  if (!input) { const imagePath = path.resolve(publicRoot, model.imagePath.replace(/^\//,"")); if (imagePath.startsWith(publicRoot + path.sep)) input = await readFile(imagePath).catch(() => fallback); }
  const image = await sharp(input || fallback, { limitInputPixels:25000000 }).rotate().resize(120,120,{fit:"cover"}).blur(18).webp({quality:65}).toBuffer().catch(async () => sharp(fallback).resize(120,120).blur(18).webp().toBuffer());
  return { input:image,left:index*150+15,top:30 };
 }));
 const image = await sharp({create:{width:1200,height:180,channels:4,background:"#19191d"}}).composite(tiles).webp({quality:70}).toBuffer();
 return new Response(new Uint8Array(image), { headers: { "content-type":"image/webp", "cache-control":"no-store", "x-content-type-options":"nosniff" } });
}
