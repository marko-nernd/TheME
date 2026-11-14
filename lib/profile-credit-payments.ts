import type Stripe from "stripe";
import { pool } from "@/db";
export async function fulfillProfileCredits(session: Stripe.Checkout.Session) {
 if(session.metadata?.kind!=="profile_credits" || session.mode!=="payment" || session.payment_status!=="paid" || session.livemode || session.currency!=="usd") return false;
 const client=await pool.connect();
 try{await client.query('BEGIN');
  const {rows:[purchase]}=await client.query('SELECT * FROM profile_credit_purchases WHERE id=$1',[session.metadata.purchaseId]);
  if(!purchase)throw new Error('Unknown credit purchase');
  const {rows:[member]}=await client.query('SELECT id FROM members WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[purchase.member_id]);
  if(!member)throw new Error('Account unavailable');
  const {rows:[locked]}=await client.query('SELECT * FROM profile_credit_purchases WHERE id=$1 FOR UPDATE',[purchase.id]);
  if(locked.stripe_session_id!==session.id || session.client_reference_id!==locked.member_id || session.metadata.memberId!==locked.member_id || session.amount_total!==locked.amount_cents || Number(session.metadata.quantity)!==locked.quantity)throw new Error('Credit payment does not match purchase');
  if(locked.status!=='paid'){
   await client.query('UPDATE members SET profile_credits=profile_credits+$2 WHERE id=$1',[locked.member_id,locked.quantity]);
   await client.query("UPDATE profile_credit_purchases SET status='paid',paid_at=now() WHERE id=$1",[locked.id]);
  }
  await client.query('COMMIT');return true;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
