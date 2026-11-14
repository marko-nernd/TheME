import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { memberReviews } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

function score(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 0;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const body = await request.json();
  const overallRating = score(body.overallRating);
  const reliabilityRating = score(body.reliabilityRating);
  const professionalismRating = score(body.professionalismRating);
  const status = body.status === "published" ? "published" : body.status === "hidden" ? "hidden" : body.status === "pending_moderation" ? "pending_moderation" : "";
  if (!overallRating || !reliabilityRating || !professionalismRating || !status) {
    return NextResponse.json({ error: "Use ratings from 1–10 and a valid moderation status." }, { status: 400 });
  }
  const { id } = await params;
  const [updated] = await db.update(memberReviews).set({
    overallRating,
    reliabilityRating,
    professionalismRating,
    wouldWorkAgain: body.wouldWorkAgain === true,
    noShow: body.noShow === true,
    comment: typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "",
    status,
    updatedAt: new Date(),
  }).where(eq(memberReviews.id, id)).returning({ id: memberReviews.id });
  if (!updated) return NextResponse.json({ error: "Rating not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
