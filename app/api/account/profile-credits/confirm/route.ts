import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { pool } from "@/db";
import { getTestStripe } from "@/lib/host-payouts";
import { fulfillProfileCredits } from "@/lib/profile-credit-payments";
export async function POST(request:Request){
 const member=await getCurrentMember();if(!member?.emailVerifiedAt)return NextResponse.json({error:"Sign in first."},{status:401});
 try{const {sessionId}=await request.json();if(typeof sessionId!=="string"||!sessionId.startsWith("cs_test_"))return NextResponse.json({error:"Invalid checkout."},{status:400});
 const {rows:[purchase]}=await pool.query('SELECT id FROM profile_credit_purchases WHERE stripe_session_id=$1 AND member_id=$2',[sessionId,member.id]);if(!purchase)return NextResponse.json({error:"Checkout not found."},{status:404});
 const session=await getTestStripe().checkout.sessions.retrieve(sessionId);const paid=await fulfillProfileCredits(session);return NextResponse.json({paid});
 }catch{return NextResponse.json({error:"Payment confirmation is not available yet. Refresh to try again."},{status:409});}
}
