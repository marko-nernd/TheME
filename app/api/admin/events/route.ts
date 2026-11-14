import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { eventValues } from "@/lib/admin-event-values";

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const values = eventValues(body);
    const baseSlug = values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
    const [event] = await db
      .insert(events)
      .values({ ...values, slug: `${baseSlug}-${Date.now().toString(36)}` })
      .returning({ id: events.id, slug: events.slug });
    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ACCOMMODATION_OPTIONS") return NextResponse.json({ error: "Add a description and a valid http or https booking link for each accommodation." }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_TRAVEL") return NextResponse.json({ error: "Enter a valid airport code and IANA timezone in the flying instructions." }, { status: 400 });
    if (error instanceof Error && ["INVALID_EVENT", "INVALID_EXTERNAL_EVENT_URL"].includes(error.message)) {
      return NextResponse.json({ error: "Complete the required event fields and check capacity, spots, and cost." }, { status: 400 });
    }
    console.error("Admin event creation failed", error);
    return NextResponse.json({ error: "Could not create the event." }, { status: 500 });
  }
}
