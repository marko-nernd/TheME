import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db";
import { identityAuditLogs, identityDocuments, members } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { encryptPrivateDocument } from "@/lib/private-document";

export const runtime = "nodejs";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumBytes = 10 * 1024 * 1024;

async function processDocument(file: File) {
  if (!acceptedTypes.has(file.type) || file.size < 1 || file.size > maximumBytes) {
    throw new Error("Use a JPG, PNG, or WebP image no larger than 10 MB.");
  }
  return sharp(Buffer.from(await file.arrayBuffer()), {
    failOn: "error",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, effort: 4 })
    .toBuffer();
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const documentType = form.get("documentType") === "passport" ? "passport" : "drivers_license";
    const legalName = String(form.get("legalName") ?? "").trim().slice(0, 160);
    const issuingCountry = String(form.get("issuingCountry") ?? "").trim().slice(0, 2).toUpperCase();
    const expiresOn = String(form.get("expiresOn") ?? "");
    const front = form.get("front");
    const back = form.get("back");
    const selfie = form.get("selfie");
    if (
      legalName.length < 2 ||
      !/^[A-Z]{2}$/.test(issuingCountry) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) ||
      expiresOn <= new Date().toISOString().slice(0, 10) ||
      !(front instanceof File) ||
      !(selfie instanceof File) ||
      (documentType === "drivers_license" && !(back instanceof File))
    ) {
      return NextResponse.json(
        { error: "Complete the legal name, country, future expiration date, and required ID images." },
        { status: 400 },
      );
    }
    const [processedFront, processedBack, processedSelfie] = await Promise.all([
      processDocument(front),
      back instanceof File && back.size ? processDocument(back) : Promise.resolve(null),
      processDocument(selfie),
    ]);
    const frontData = encryptPrivateDocument(processedFront);
    const backData = processedBack ? encryptPrivateDocument(processedBack) : null;
    const selfieData = encryptPrivateDocument(processedSelfie);
    await db.transaction(async (transaction) => {
      await transaction
        .insert(identityDocuments)
        .values({
          memberId: member.id,
          documentType,
          legalName,
          issuingCountry,
          expiresOn,
          frontData,
          frontMime: "image/webp",
          backData,
          backMime: backData ? "image/webp" : null,
          selfieData,
          selfieMime: "image/webp",
        })
        .onConflictDoUpdate({
          target: identityDocuments.memberId,
          set: {
            documentType,
            legalName,
            issuingCountry,
            expiresOn,
            frontData,
            frontMime: "image/webp",
            backData,
            backMime: backData ? "image/webp" : null,
            selfieData,
            selfieMime: "image/webp",
            updatedAt: new Date(),
          },
        });
      await transaction
        .update(members)
        .set({
          identityVerificationStatus: "pending",
          identityVerifiedAt: null,
          identityReviewNotes: null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));
      await transaction.insert(identityAuditLogs).values({
        memberId: member.id,
        action: "document_uploaded",
        detail: documentType,
      });
    });
    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    console.error("Identity verification upload failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload the ID." },
      { status: 400 },
    );
  }
}
