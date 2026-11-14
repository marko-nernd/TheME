import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { pool } from "@/db";
import { activityStatsOptions } from "@/lib/activity-stats-options";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Admin authentication required." }, { status:401 });
 try {
 const { days,role,day,hour,weekday,page,online } = activityStatsOptions(new URL(request.url).searchParams);
 const zone = "America/Phoenix";
 const params = [zone,days,role];
 const scope = `WITH scoped AS (
 SELECT a.*, (a.bucket_at AT TIME ZONE $1)::date AS local_day, extract(dow from a.bucket_at AT TIME ZONE $1)::int AS weekday, extract(hour from a.bucket_at AT TIME ZONE $1)::int AS hour
 FROM member_activity_buckets a JOIN members m ON m.id=a.member_id
 WHERE m.deleted_at IS NULL AND m.primary_role IN ('model','photographer') AND ($3='all' OR m.primary_role::text=$3)
 AND a.bucket_at >= (((now() AT TIME ZONE $1)::date - ($2::int - 1))::timestamp AT TIME ZONE $1))`;
 const [daily,hours,summary,people,metadata] = await Promise.all([
  pool.query(scope+` SELECT to_char(local_day,'YYYY-MM-DD') AS day,count(*)::int AS minutes,count(distinct member_id)::int AS members FROM scoped GROUP BY local_day ORDER BY local_day`,params),
  pool.query(scope+` SELECT weekday,hour,count(*)::int AS minutes,count(distinct member_id)::int AS members FROM scoped GROUP BY weekday,hour ORDER BY weekday,hour`,params),
  pool.query(scope+` SELECT count(*)::int AS minutes,count(distinct member_id)::int AS members,(SELECT count(distinct a.member_id)::int FROM member_activity_buckets a JOIN members m ON m.id=a.member_id WHERE m.deleted_at IS NULL AND m.primary_role IN ('model','photographer') AND ($3='all' OR m.primary_role::text=$3) AND a.bucket_at>=now()-interval '3 minutes') AS online FROM scoped`,params),
  pool.query(scope+`, filtered AS (SELECT * FROM scoped WHERE ($4='' OR local_day= NULLIF($4,'')::date) AND ($5::int IS NULL OR hour=$5) AND ($6::int IS NULL OR weekday=$6))
  SELECT m.id,m.name,m.username,m.primary_role AS role,p.slug,m.last_active_at AS last_seen,
   count(a.id)::int AS minutes,count(distinct a.local_day)::int AS active_days,
   EXISTS(SELECT 1 FROM member_activity_buckets recent WHERE recent.member_id=m.id AND recent.bucket_at>=now()-interval '3 minutes') AS online,
   count(*) OVER()::int AS total_rows
  FROM members m LEFT JOIN profiles p ON p.member_id=m.id LEFT JOIN filtered a ON a.member_id=m.id
  WHERE m.deleted_at IS NULL AND m.primary_role IN ('model','photographer') AND ($3='all' OR m.primary_role::text=$3)
   AND (NOT $7::boolean OR EXISTS(SELECT 1 FROM member_activity_buckets recent WHERE recent.member_id=m.id AND recent.bucket_at>=now()-interval '3 minutes'))
  GROUP BY m.id,p.slug
  HAVING (($4='' AND $5::int IS NULL AND $6::int IS NULL) OR count(a.id)>0)
  ORDER BY online DESC,minutes DESC,m.name,m.id LIMIT 25 OFFSET $8`, [...params,day,hour,weekday,online,(page-1)*25]),
  pool.query(`SELECT started_at, to_char(now() AT TIME ZONE $1,'YYYY-MM-DD') AS today FROM member_activity_tracking WHERE id=1`,[zone]),
 ]);
 return NextResponse.json({ timezone:zone,days,role,summary:summary.rows[0],daily:daily.rows,hours:hours.rows,people:people.rows.map(({total_rows,...person})=>person),total:people.rows[0]?.total_rows || 0,page,pageSize:25,today:metadata.rows[0].today,trackingStartedAt:metadata.rows[0].started_at,updatedAt:new Date().toISOString() },{headers:{"cache-control":"private, no-store"}});
 } catch(error) {
  if(error instanceof Error && /Invalid/.test(error.message)) return NextResponse.json({error:"Check the activity filters."},{status:400});
  console.warn("Admin activity statistics unavailable.");
  return NextResponse.json({error:"Activity statistics could not be loaded. Try refreshing."},{status:503});
 }
}
