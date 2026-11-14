import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { pool } from "@/db";
import { getTestStripe } from "@/lib/host-payouts";
import { getSiteUrl } from "@/lib/stripe";
export async function POST(request:Request){
 const member=await getCurrentMember();if(!member?.emailVerifiedAt)return NextResponse.json({error:"Sign in first."},{status:401});
 try{
  const {quantity}=await request.json();if(![1,3,10].includes(quantity))return NextResponse.json({error:"Choose 1, 3, or 10 credits."},{status:400});
  const stripe=getTestStripe();
  const {rows:[recent]}=await pool.query("SELECT checkout_url FROM profile_credit_purchases WHERE member_id=$1 AND quantity=$2 AND status='pending' AND checkout_url IS NOT NULL AND created_at>now()-interval '25 minutes' ORDER BY created_at DESC LIMIT 1",[member.id,quantity]);
  if(recent)return NextResponse.json({url:recent.checkout_url});
  const {rows:[purchase]}=await pool.query('INSERT INTO profile_credit_purchases(member_id,quantity,amount_cents) VALUES($1,$2,$3) RETURNING id',[member.id,quantity,quantity*50]);
  const session=await stripe.checkout.sessions.create({mode:"payment",payment_method_types:["card"],client_reference_id:member.id,customer_email:member.email,metadata:{kind:"profile_credits",purchaseId:purchase.id,memberId:member.id,quantity:String(quantity)},line_items:[{price_data:{currency:"usd",unit_amount:50,product_data:{name:"Public profile change credit"}},quantity}],success_url:`${getSiteUrl()}/dashboard?creditCheckout={CHECKOUT_SESSION_ID}#settings`,cancel_url:`${getSiteUrl()}/dashboard#settings`,expires_at:Math.floor(Date.now()/1000)+1800},{idempotencyKey:`profile-credits-${purchase.id}`});
  await pool.query('UPDATE profile_credit_purchases SET stripe_session_id=$2,checkout_url=$3 WHERE id=$1',[purchase.id,session.id,session.url]);
  return NextResponse.json({url:session.url});
 }catch{return NextResponse.json({error:"Could not start credit checkout. Stripe test billing must be configured."},{status:503});}
}
