import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { homeHeroSlides } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";

export async function PATCH(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string").slice(0, 100) : [];
  if (!ids.length || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "Provide a valid slide order." }, { status: 400 });
  }
  await db.transaction(async (transaction) => {
    await Promise.all(ids.map((id: string, sortOrder: number) =>
      transaction.update(homeHeroSlides).set({ sortOrder, updatedAt: new Date() }).where(eq(homeHeroSlides.id, id)),
    ));
  });
  return NextResponse.json({ ok: true });
}
