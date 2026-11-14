import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getCurrentMember } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { eligibleFlightBooking } from "@/lib/attendee-flights";
import { validTimezone } from "@/lib/event-travel-fields";
import { uuidPattern } from "@/lib/event-pass";
export const dynamic = "force-dynamic";
const privateHeaders = { "cache-control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders });
async function access(request: Request, id: string) {
  if (!uuidPattern.test(id)) return null;
  const member = await getCurrentMember();
  const admin = await getCurrentAdmin();
  const event = await pool.query("select owner_id from events where id=$1", [id]);
  if (!event.rows.length) return null;
  const guestId = request.headers.get("x-guest-booking");
  const token = request.headers.get("x-guest-token");
  const guest = guestId && uuidPattern.test(guestId) && token && token.length < 500 ? { id: guestId, token } : undefined;
  const booking = await eligibleFlightBooking(id, member?.id, guest);
  return { manager: Boolean(admin || member?.id === event.rows[0].owner_id), booking };
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await access(request, id);
  const manager = Boolean(allowed?.manager && new URL(request.url).searchParams.get("mine") !== "1");
  if (!allowed || (!manager && !allowed.booking)) return json({ error: "Only confirmed attendees, the event host, or an admin can access flight details." }, 403);
  const { rows } = await pool.query(`select p.id as "participationId", p.applicant_name as name, p.path_type as role,
    f.airline, f.flight_number as "flightNumber", f.arrival_local as "arrivalLocal", f.departure_local as "departureLocal", f.timezone, f.notes, f.updated_at as "updatedAt"
    from attendee_flights f join event_participations p on p.id=f.participation_id
    where p.event_id=$1 and ($2::boolean or p.id=$3::uuid) order by f.arrival_local limit 1000`, [id, manager, allowed.booking?.id ?? null]);
  return json({ items: rows, manager });
}
function validLocal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(`${value}:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 16) === value;
}
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await access(request, id);
  if (!allowed?.booking) return json({ error: "A current confirmed booking is required. Paid bookings must have a completed payment." }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Invalid flight details." }, 400); }
  const fields = { airline: 120, flightNumber: 20, arrivalLocal: 16, departureLocal: 16, timezone: 80, notes: 1000 };
  const data: Record<string, string> = {};
  for (const [key, max] of Object.entries(fields)) {
    if (body[key] !== undefined && typeof body[key] !== "string") return json({ error: "Check the flight fields." }, 400);
    data[key] = String(body[key] ?? "").trim();
    if (data[key].length > max) return json({ error: `${key} is too long.` }, 400);
  }
  if (!/^[A-Za-z0-9 -]{2,20}$/.test(data.flightNumber) || !validLocal(data.arrivalLocal) || !validTimezone(data.timezone) || (data.departureLocal && (!validLocal(data.departureLocal) || data.departureLocal < data.arrivalLocal))) return json({ error: "Enter a flight number, valid arrival date/time, and IANA timezone. Departure must be after arrival." }, 400);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const current = await client.query(`select p.id from event_participations p where p.id=$1 and p.status='confirmed' and (p.price_cents+p.accommodation_price_cents=0 or exists(select 1 from event_transactions t where t.participation_id=p.id and t.status='paid')) for update`, [allowed.booking.id]);
    if (!current.rows.length) { await client.query("rollback"); return json({ error: "This booking is no longer confirmed." }, 403); }
    await client.query(`insert into attendee_flights(participation_id,airline,flight_number,arrival_local,departure_local,timezone,notes)
      values($1,$2,$3,$4,$5,$6,$7) on conflict(participation_id) do update set airline=$2,flight_number=$3,arrival_local=$4,departure_local=$5,timezone=$6,notes=$7,updated_at=now()`, [allowed.booking.id, data.airline, data.flightNumber.toUpperCase(), data.arrivalLocal, data.departureLocal, data.timezone, data.notes]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
  return json({ ok: true });
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const allowed = await access(request, (await params).id);
  if (!allowed?.booking) return json({ error: "A confirmed booking is required." }, 403);
  await pool.query("delete from attendee_flights where participation_id=$1", [allowed.booking.id]);
  return json({ ok: true });
}
