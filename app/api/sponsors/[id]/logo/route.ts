import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sponsors } from "@/db/schema";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [record] = await db.select({ data: sponsors.logoData, mime: sponsors.logoMime, filename: sponsors.logoFilename }).from(sponsors).where(eq(sponsors.id, (await params).id)).limit(1);
  if (!record?.data || !record.mime) return new Response(null, { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(record.data), { headers: {
    "content-type": record.mime,
    "content-disposition": `${download ? "attachment" : "inline"}; filename="${(record.filename || "sponsor-logo").replaceAll('"', "")}"`,
    "cache-control": "private, max-age=300",
  } });
}
