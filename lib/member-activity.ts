import { pool } from "@/db";
export async function recordMemberActivity(memberId: string) {
 try {
  await pool.query(`INSERT INTO member_activity_buckets(member_id,bucket_at)
   SELECT id,date_trunc('minute',now()) FROM members WHERE id=$1 AND deleted_at IS NULL AND primary_role IN ('model','photographer')
   ON CONFLICT (member_id,bucket_at) DO NOTHING`, [memberId]);
 } catch { console.warn("Activity statistics could not be recorded."); }
}
