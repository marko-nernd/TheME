import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!emailPattern.test(email) || email.length > 320) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    await db
      .insert(newsletterSubscribers)
      .values({ email })
      .onConflictDoNothing({ target: newsletterSubscribers.email });

    return Response.json({ subscribed: true }, { status: 201 });
  } catch {
    return Response.json({ error: "The database is unavailable." }, { status: 503 });
  }
}
