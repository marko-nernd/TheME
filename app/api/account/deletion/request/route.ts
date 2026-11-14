import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { pool } from "@/db";
import { deletionCodeHash } from "@/lib/account-deletion-policy";
import { sendAccountDeletionCode } from "@/lib/email";
export async function POST(){
 const member=await getCurrentMember();if(!member?.emailVerifiedAt)return NextResponse.json({error:"Sign in first."},{status:401});
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query('SELECT id FROM members WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[member.id]);
  const {rows:[previous]}=await client.query('SELECT requested_at FROM account_deletion_challenges WHERE member_id=$1',[member.id]);
  if(previous&&Date.now()-new Date(previous.requested_at).getTime()<60000){await client.query('ROLLBACK');return NextResponse.json({error:"Wait one minute before requesting another code."},{status:429});}
  const code=String(randomInt(0,1000000)).padStart(6,"0");
  await client.query(`INSERT INTO account_deletion_challenges(member_id,code_hash,expires_at) VALUES($1,$2,now()+interval '10 minutes') ON CONFLICT(member_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,requested_at=now(),attempts=0,consumed_at=NULL`,[member.id,deletionCodeHash(member.id,code)]);
  await sendAccountDeletionCode(member.email,member.name,code);await client.query('COMMIT');return NextResponse.json({ok:true,expiresInMinutes:10});
 }catch{await client.query('ROLLBACK');return NextResponse.json({error:"Could not send the confirmation email. Try again later."},{status:503});}finally{client.release();}
}
