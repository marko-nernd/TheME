import { NextResponse } from "next/server";
import { getCurrentMember,sessionCookieName } from "@/lib/auth";
import { pool } from "@/db";
import { deletionCodeMatches,deletionConfirmation } from "@/lib/account-deletion-policy";
import { purgeMemberAccount } from "@/lib/member-deletion";
export async function POST(request:Request){
 const member=await getCurrentMember();if(!member?.emailVerifiedAt)return NextResponse.json({error:"Sign in first."},{status:401});
 const body=await request.json().catch(()=>({}));
 if(body.confirmation!==deletionConfirmation||typeof body.code!=="string")return NextResponse.json({error:"Enter the emailed code and type DELETE MY ACCOUNT exactly."},{status:400});
 const client=await pool.connect();let locked=false;
 try{
  locked=(await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[member.id])).rows[0].locked;
  if(!locked)return NextResponse.json({error:"A deletion is already being processed."},{status:409});
  await client.query('BEGIN');const {rows:[challenge]}=await client.query('SELECT * FROM account_deletion_challenges WHERE member_id=$1 FOR UPDATE',[member.id]);
  if(!challenge||challenge.consumed_at||new Date(challenge.expires_at).getTime()<=Date.now()||challenge.attempts>=5){await client.query('ROLLBACK');return NextResponse.json({error:"This code expired or is no longer valid. Request a new one."},{status:400});}
  if(!deletionCodeMatches(member.id,body.code,challenge.code_hash)){await client.query('UPDATE account_deletion_challenges SET attempts=attempts+1 WHERE member_id=$1',[member.id]);await client.query('COMMIT');return NextResponse.json({error:"Incorrect confirmation code."},{status:400});}
  await client.query('UPDATE account_deletion_challenges SET consumed_at=now() WHERE member_id=$1',[member.id]);await client.query('COMMIT');
  const result=await purgeMemberAccount(member.id);
  const response=NextResponse.json({ok:true,billingNeedsAttention:result.billingWarnings.length>0});response.cookies.set(sessionCookieName,"",{httpOnly:true,sameSite:"lax",path:"/",maxAge:0});return response;
 }catch{await client.query('ROLLBACK').catch(()=>{});return NextResponse.json({error:"Deletion could not finish. Request a new confirmation code and try again, or contact support."},{status:503});}finally{if(locked)await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[member.id]);client.release();}
}
