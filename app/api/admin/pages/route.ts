import { NextResponse } from "next/server";
import { db } from "@/db";
import { sitePageRevisions, sitePageSettings } from "@/db/schema";
import { defaultSitePageSettings } from "@/db/queries";
import { getCurrentAdmin } from "@/lib/admin-auth";

const allowedPages = new Set(Object.keys(defaultSitePageSettings));

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function PUT(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const body = await request.json();
  const pageKey = clean(body.pageKey, 30);
  const title = clean(body.title, 160);
  if (!allowedPages.has(pageKey) || !title) {
    return NextResponse.json({ error: "Choose a supported page and enter a title." }, { status: 400 });
  }
  const content: Record<string, string> = pageKey === "home" ? {
    builtEyebrow: clean(body.builtEyebrow, 100), builtTitle: clean(body.builtTitle, 180), builtIntro: clean(body.builtIntro, 700),
    membershipEyebrow: clean(body.membershipEyebrow, 100), membershipTitle: clean(body.membershipTitle, 180), membershipIntro: clean(body.membershipIntro, 700),
  } : {};
  const values = {
    pageKey,
    eyebrow: clean(body.eyebrow, 100),
    title,
    intro: clean(body.intro, 700),
    imagePath: clean(body.imagePath, 500),
    headerBackgroundColor: /^#[0-9a-f]{6}$/i.test(clean(body.headerBackgroundColor, 7)) ? clean(body.headerBackgroundColor, 7) : "#11110f",
    content,
    seoTitle: clean(body.seoTitle, 160),
    seoDescription: clean(body.seoDescription, 320),
    shareImagePath: clean(body.shareImagePath, 500),
    updatedAt: new Date(),
  };
  await db.transaction(async (transaction) => {
    await transaction.insert(sitePageSettings).values(values).onConflictDoUpdate({
      target: sitePageSettings.pageKey,
      set: values,
    });
    await transaction.insert(sitePageRevisions).values({
      pageKey,
      snapshot: Object.fromEntries(Object.entries(values).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : key === "content" ? Object.entries(value as Record<string, string>).map(([contentKey, contentValue]) => [`content.${contentKey}`, contentValue]) : [])) as Record<string, string>,
      adminId: (await getCurrentAdmin())?.id,
    });
  });
  return NextResponse.json({ ok: true, page: values });
}
