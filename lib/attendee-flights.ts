import { pool } from "@/db";
import { hashToken } from "@/lib/auth";
export async function eligibleFlightBooking(eventId: string, memberId?: string, guest?: { id: string; token: string }) {
  if (!memberId && !guest) return null;
  const { rows } = await pool.query(`select p.id from event_participations p where p.event_id=$1 and p.status='confirmed'
    and (($2::uuid is not null and p.member_id=$2) or (p.id=$3::uuid and p.member_id is null and p.guest_access_token_hash=$4))
    and (p.price_cents + p.accommodation_price_cents = 0 or exists(select 1 from event_transactions t where t.participation_id=p.id and t.status='paid')) limit 1`, [eventId, memberId ?? null, guest?.id ?? null, guest ? hashToken(guest.token) : null]);
  return (rows[0] as { id: string } | undefined) ?? null;
}
