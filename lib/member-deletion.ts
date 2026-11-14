import { rm } from "node:fs/promises";
import path from "node:path";
import { pool } from "@/db";
import { getStripe } from "@/lib/stripe";
import { deleteUnusedPublicMedia } from "@/lib/admin-media-library";

async function memberFileCandidates(memberId: string) {
  const result = await pool.query<{ path: string | null }>(
    `select path from (
       select profile.image_path as path
         from profiles profile where profile.member_id = $1
       union all
       select item.image_path
         from portfolio_items item
         join profiles profile on profile.id = item.profile_id
        where profile.member_id = $1
       union all
       select event.image_path
         from events event where event.owner_id = $1
       union all
       select sponsor.logo_path
         from sponsors sponsor
         join sponsor_members membership on membership.sponsor_id = sponsor.id
        where membership.member_id = $1
     ) member_files where path is not null`,
    [memberId],
  );
  return result.rows.map((row) => row.path);
}

async function cancelRecurringBilling(memberId: string) {
  const result = await pool.query(
    `select subscription.stripe_subscription_id
       from subscriptions subscription
       join billing_customers customer on customer.id = subscription.billing_customer_id
      where customer.member_id = $1
        and subscription.status in ('active', 'trialing', 'past_due', 'unpaid')`,
    [memberId],
  );
  if (!result.rowCount || !process.env.STRIPE_SECRET_KEY) return [] as string[];
  const stripe = getStripe();
  const warnings: string[] = [];
  for (const row of result.rows) {
    try {
      await stripe.subscriptions.cancel(row.stripe_subscription_id as string);
    } catch (error) {
      console.error("Stripe subscription cancellation failed during member deletion", {
        memberId,
        subscriptionId: row.stripe_subscription_id,
        error,
      });
      warnings.push(String(row.stripe_subscription_id));
    }
  }
  return warnings;
}

export async function purgeMemberAccount(memberId: string) {
  const memberResult = await pool.query<{ name: string }>(
    "select name from members where id = $1 and deleted_at is null",
    [memberId],
  );
  if (!memberResult.rowCount) return { deleted: false, deletedFiles: 0, billingWarnings: [] as string[] };
  const retainedDisplayName = memberResult.rows[0]?.name;
  const fileCandidates = await memberFileCandidates(memberId);
  const ownedEvents=await pool.query('SELECT id FROM events WHERE owner_id=$1',[memberId]);
  const billingWarnings = await cancelRecurringBilling(memberId);
  await pool.query("select purge_member_account($1::uuid)", [memberId]);
  if (retainedDisplayName) {
    await pool.query(
      "update members set name = $2 where id = $1 and deleted_at is not null",
      [memberId, retainedDisplayName],
    );
  }
  await pool.query(`UPDATE members SET social_avatar_data=NULL,social_avatar_provider=NULL,social_avatar_handle=NULL,avatar_source='upload',profile_credits=0,profile_identity_changes_used=0 WHERE id=$1 AND deleted_at IS NOT NULL`,[memberId]);
  await pool.query('DELETE FROM member_activity_buckets WHERE member_id=$1',[memberId]);
  await pool.query('DELETE FROM profile_credit_purchases WHERE member_id=$1',[memberId]);
  await pool.query('DELETE FROM account_deletion_challenges WHERE member_id=$1',[memberId]);
  await pool.query(`UPDATE admin_audit_logs SET before_data=before_data-'avatarData'-'socialAvatarData'-'passwordHash',after_data=after_data-'avatarData'-'socialAvatarData'-'passwordHash' WHERE resource_id=$1 AND resource_type='member'`,[memberId]);
  const uploadsRoot=path.resolve(process.env.MEDIA_LIBRARY_ROOT||path.join(process.cwd(),'public'),'uploads','events');
  for(const event of ownedEvents.rows){const directory=path.resolve(uploadsRoot,event.id);if(directory.startsWith(uploadsRoot+path.sep))await rm(directory,{recursive:true,force:true});}
  const deletedFiles = await deleteUnusedPublicMedia(fileCandidates);
  return { deleted: true, deletedFiles, billingWarnings };
}
