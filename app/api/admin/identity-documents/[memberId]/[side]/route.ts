import { eq } from "drizzle-orm";
import { db } from "@/db";
import { identityAuditLogs, identityDocuments } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { decryptPrivateDocument } from "@/lib/private-document";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string; side: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response(null, { status: 401 });
  const { memberId, side } = await params;
  const [document] = await db
    .select({
      frontData: identityDocuments.frontData,
      frontMime: identityDocuments.frontMime,
      backData: identityDocuments.backData,
      backMime: identityDocuments.backMime,
      selfieData: identityDocuments.selfieData,
      selfieMime: identityDocuments.selfieMime,
    })
    .from(identityDocuments)
    .where(eq(identityDocuments.memberId, memberId))
    .limit(1);
  const data = side === "back" ? document?.backData : side === "selfie" ? document?.selfieData : document?.frontData;
  const mime = side === "back" ? document?.backMime : side === "selfie" ? document?.selfieMime : document?.frontMime;
  if (!data || !mime) return new Response(null, { status: 404 });
  await db.insert(identityAuditLogs).values({
    memberId,
    adminId: admin.id,
    action: "document_viewed",
    detail: side === "back" ? "back" : side === "selfie" ? "selfie" : "front",
  });
  const decrypted = decryptPrivateDocument(data);
  return new Response(new Uint8Array(decrypted), {
    headers: {
      "content-type": mime,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
