import { and, eq, ilike, inArray, isNotNull, isNull, notInArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, profiles, events, eventParticipations, memberNotifications } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCurrentMember } from "@/lib/auth";
import { isHostRole } from "@/lib/roles";
import { uuidPattern } from "@/lib/event-pass";
import { recordAdminAudit } from "@/lib/admin-audit";
const inactive: Array<typeof eventParticipations.$inferSelect.status> = ["cancelled", "declined", "refunded"];
export async function complimentaryPlaces(request: Request, eventId: string, adminMode: boolean) {
 const admin = adminMode ? await getCurrentAdmin() : null;
 const host = adminMode ? null : await getCurrentMember();
 if (adminMode ? !admin : !host?.emailVerifiedAt || !isHostRole(host.primaryRole)) return NextResponse.json({ error: "Sign in as an administrator or event host." }, { status: 401 });
 if (!uuidPattern.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });
 const owner = adminMode ? undefined : eq(events.ownerId, host!.id);
 const [event] = await db.select().from(events).where(and(eq(events.id, eventId), owner)).limit(1);
 if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
 const eligible = and(inArray(members.primaryRole, ["model", "photographer"]), isNull(members.deletedAt), isNotNull(members.emailVerifiedAt), isNotNull(members.adminApprovedAt));
 if (request.method === "GET") {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || "";
  if (query.length < 2) return NextResponse.json({ profiles: [] });
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  const found = await db.select({ id: members.id, name: profiles.name, username: members.username, slug: profiles.slug, role: members.primaryRole }).from(members).innerJoin(profiles, eq(profiles.memberId, members.id)).where(and(eligible, or(ilike(profiles.name, `%${escaped}%`), ilike(members.username, `%${escaped}%`), ilike(profiles.slug, `%${escaped}%`)))).orderBy(profiles.name).limit(10);
  return NextResponse.json({ profiles: found }, { headers: { "cache-control": "no-store" } });
 }
 try {
  const body = await request.json();
  if (typeof body.memberId !== "string" || !uuidPattern.test(body.memberId)) return NextResponse.json({ error: "Select a profile from the search results." }, { status: 400 });
  const outcome = await db.transaction(async (tx) => {
   const [locked] = await tx.select().from(events).where(and(eq(events.id, eventId), owner)).for("update");
   if (!locked) return { error: "Event not found.", status: 404 };
   if ((locked.endsAt ?? locked.startsAt).getTime() < Date.now()) return { error: "This event has ended.", status: 409 };
   const [person] = await tx.select({ id: members.id, name: members.name, email: members.email, role: members.primaryRole }).from(members).innerJoin(profiles, eq(profiles.memberId, members.id)).where(and(eq(members.id, body.memberId), eligible)).for("update", { of: members });
   if (!person) return { error: "Choose an active, approved model or photographer profile.", status: 404 };
   const active = await tx.select({ memberId: eventParticipations.memberId, email: eventParticipations.applicantEmail, pathType: eventParticipations.pathType }).from(eventParticipations).where(and(eq(eventParticipations.eventId, eventId), notInArray(eventParticipations.status, inactive)));
   if (active.some((booking) => booking.memberId === person.id || booking.email.toLowerCase() === person.email.toLowerCase())) return { error: "This person already has an active booking or application. Existing payments and bookings have been kept.", status: 409 };
   const path = locked.participationPaths.find((item) => item.type === person.role && item.enabled);
   if (active.length >= locked.capacity || path && active.filter((booking) => booking.pathType === person.role).length >= path.capacity) return { error: "There are no places remaining for this participant. Adjust event capacity first.", status: 409 };
   const [booking] = await tx.insert(eventParticipations).values({ eventId, memberId: person.id, applicantName: person.name, applicantEmail: person.email.toLowerCase(), pathType: person.role, status: "confirmed", priceCents: 0, accommodationPriceCents: 0, note: `Complimentary admission added by ${adminMode ? "administrator" : "event host"}. Accommodation is not included.` }).returning({ id: eventParticipations.id });
   await tx.insert(memberNotifications).values({ memberId: person.id, type: "event_approved", title: "Complimentary event place", message: `You have been added to ${locked.title} at no charge. View your event pass in your dashboard.`, href: `/passes/${booking.id}`, resourceId: booking.id });
   return { id: booking.id, name: person.name };
  });
  if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  if (admin) await recordAdminAudit({ adminId: admin.id, action: "complimentary_event_place", resourceType: "event_participation", resourceId: outcome.id, afterData: { eventId, memberId: body.memberId, priceCents: 0 } });
  return NextResponse.json({ ok: true, name: outcome.name, participationId: outcome.id });
 } catch { return NextResponse.json({ error: "Could not add the complimentary place. Refresh and try again." }, { status: 400 }); }
}
