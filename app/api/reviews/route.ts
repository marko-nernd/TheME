import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getCurrentMember } from "@/lib/auth";

function score(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 0;
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Verified member account required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const reviewedMemberId = typeof body.reviewedMemberId === "string" ? body.reviewedMemberId : "";
    const overallRating = score(body.overallRating);
    const reliabilityRating = score(body.reliabilityRating);
    const professionalismRating = score(body.professionalismRating);
    const wouldWorkAgain = body.wouldWorkAgain === true;
    const noShow = body.noShow === true;
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";
    if (!eventId || !reviewedMemberId || reviewedMemberId === member.id || !overallRating || !reliabilityRating || !professionalismRating) {
      return NextResponse.json({ error: "Complete all three ratings." }, { status: 400 });
    }

    const permission = await pool.query(
      `select
         e.owner_id = $1 as reviewer_is_host,
         coalesce(e.ends_at, e.starts_at) < now() as event_complete,
         reviewer.primary_role as reviewer_role,
         target.primary_role as target_role,
         e.owner_id = $2 as target_is_host,
         exists(
           select 1 from event_participations rp
            where rp.event_id = e.id and rp.member_id = $1 and rp.status = 'confirmed'
         ) as reviewer_attended,
         exists(
           select 1 from event_participations tp
            where tp.event_id = e.id and tp.member_id = $2 and tp.status = 'confirmed'
         ) as target_attended
         ,exists(select 1 from event_participations checked where checked.event_id=e.id and checked.member_id=$2 and checked.checked_in_at is not null) as target_checked_in
       from events e
       join members reviewer on reviewer.id = $1
       join members target on target.id = $2
       where e.id = $3`,
      [member.id, reviewedMemberId, eventId],
    );
    const allowed = permission.rows[0];
    const relationshipAllowed =
      (allowed?.reviewer_is_host && allowed.reviewer_role === "host" && ["model", "photographer"].includes(allowed.target_role) && allowed.target_attended) ||
      (allowed?.reviewer_attended && allowed.reviewer_role === "photographer" && allowed.target_role === "model" && allowed.target_attended) ||
      (allowed?.reviewer_attended && allowed.reviewer_role === "model" && allowed.target_role === "photographer" && allowed.target_attended) ||
      (allowed?.reviewer_attended && allowed.reviewer_role === "model" && allowed.target_is_host && allowed.target_role === "host");
    if (
      !allowed?.event_complete ||
      !relationshipAllowed ||
      (noShow && (!allowed.reviewer_is_host || allowed.target_checked_in || !["model", "photographer"].includes(allowed.target_role) || comment.length < 20))
    ) {
      return NextResponse.json(
        { error: "Ratings require a completed verified collaboration. Missed-commitment reports require at least 20 characters of context and are held for admin moderation." },
        { status: 403 },
      );
    }

    await pool.query(
      `insert into member_reviews
        (event_id, reviewer_member_id, reviewed_member_id, overall_rating, reliability_rating, professionalism_rating, would_work_again, no_show, comment, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [eventId, member.id, reviewedMemberId, overallRating, reliabilityRating, professionalismRating, wouldWorkAgain, noShow, comment, noShow ? "pending_moderation" : "published"],
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "You already reviewed this person for this event." }, { status: 409 });
    }
    console.error("Member review failed", error);
    return NextResponse.json({ error: "Could not save the review." }, { status: 500 });
  }
}
