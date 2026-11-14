import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { pool } from "@/db";
export async function GET(){
 const member=await getCurrentMember();if(!member?.emailVerifiedAt)return NextResponse.json({error:"Sign in first."},{status:401});
 const {rows:[row]}=await pool.query('SELECT profile_credits AS balance,profile_identity_changes_used AS used FROM members WHERE id=$1 AND deleted_at IS NULL',[member.id]);
 return NextResponse.json({...row,freeRemaining:Math.max(0,3-row.used),creditPriceCents:50,urlChangeCredits:3,nameChangeCredits:1},{headers:{"cache-control":"no-store"}});
}
