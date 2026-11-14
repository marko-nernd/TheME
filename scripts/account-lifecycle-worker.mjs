import nodemailer from "nodemailer";
import pg from "pg";
import Stripe from "stripe";

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL,
});
const mail = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
});
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const from = process.env.EMAIL_FROM ?? "Model Escape <verify@modelescape.local>";
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

async function sendLifecycleEmail(member, finalWarning = false) {
  const safeName = escapeHtml(member.name);
  const subject = finalWarning
    ? "Final warning: your Model Escape account is scheduled for deletion"
    : "We haven’t seen you on Model Escape recently";
  const timing = finalWarning
    ? "Sign in within 14 days to keep your account, profile, images, and activity."
    : "Your account has been inactive for six months. Sign in to keep it active.";
  await mail.sendMail({
    from,
    to: member.email,
    subject,
    text: `Hi ${member.name},\n\n${timing}\n\n${origin}/login`,
    html: `<div style="font-family:Montserrat,Arial,sans-serif;background:#11110f;color:#fff;padding:40px">
      <p style="color:#ff2d95;font-weight:800;letter-spacing:2px">MODEL ESCAPE</p>
      <h1>${finalWarning ? "Your account is scheduled for deletion." : "We’d like to see you again."}</h1>
      <p style="color:#c9c7c0;line-height:1.7">Hi ${safeName}, ${escapeHtml(timing)}</p>
      <p style="margin-top:28px"><a href="${origin}/login" style="display:inline-block;background:#ff2d95;color:#11110f;padding:15px 20px;text-decoration:none;font-weight:800">Sign in and keep my account →</a></p>
    </div>`,
  });
}

async function cancelMemberSubscriptions(memberId) {
  if (!stripe) return;
  const result = await pool.query(
    `select s.stripe_subscription_id
       from subscriptions s
       join billing_customers b on b.id = s.billing_customer_id
      where b.member_id = $1 and s.status in ('active', 'trialing', 'past_due', 'unpaid')`,
    [memberId],
  );
  for (const row of result.rows) {
    try {
      await stripe.subscriptions.cancel(row.stripe_subscription_id);
    } catch (error) {
      console.error("Could not cancel subscription before account deletion", error);
      throw error;
    }
  }
}

export async function runLifecycleSweep() {
  const inactive = await pool.query(
    `select id, name, email
      from members
      where deleted_at is null
        and last_active_at <= now() - interval '6 months'
        and last_active_at > now() - interval '1 year'
        and inactivity_reminder_sent_at is null`,
  );
  for (const member of inactive.rows) {
    await sendLifecycleEmail(member);
    await pool.query(
      `update members set inactivity_reminder_sent_at = now(), updated_at = now()
        where id = $1 and inactivity_reminder_sent_at is null`,
      [member.id],
    );
  }

  const finalWarnings = await pool.query(
    `select id, name, email
      from members
      where deleted_at is null
        and last_active_at <= now() - interval '1 year'
        and final_warning_sent_at is null`,
  );
  for (const member of finalWarnings.rows) {
    await sendLifecycleEmail(member, true);
    await pool.query(
      `update members
          set final_warning_sent_at = now(),
              account_deletion_scheduled_at = now() + interval '14 days',
              updated_at = now()
        where id = $1 and final_warning_sent_at is null`,
      [member.id],
    );
  }

  const due = await pool.query(
    `select id, name from members
      where account_deletion_scheduled_at is not null
        and deleted_at is null
        and account_deletion_scheduled_at <= now()
        and last_active_at <= final_warning_sent_at`,
  );
  for (const member of due.rows) {
    await cancelMemberSubscriptions(member.id);
    await pool.query("select purge_member_account($1::uuid)", [member.id]);
    await pool.query(
      "update members set name = $2 where id = $1 and deleted_at is not null",
      [member.id, member.name],
    );
  }

  const retainedIds = await pool.query(
    `select d.member_id
       from identity_documents d
       join members m on m.id = d.member_id
      where m.identity_verification_status in ('approved', 'rejected')
        and d.updated_at <= now() - interval '30 days'`,
  );
  for (const document of retainedIds.rows) {
    await pool.query(
      `insert into identity_audit_logs (member_id, action, detail)
       values ($1, 'document_purged', '30-day post-review retention expired')`,
      [document.member_id],
    );
    await pool.query("delete from identity_documents where member_id = $1", [document.member_id]);
  }

  const purgedRequests = await pool.query(
    `delete from collaboration_requests
      where sender_hidden_at is not null
        and sender_hidden_at <= now() - interval '30 days'
        and not exists (
          select 1
            from members sender
           where sender.id = collaboration_requests.sender_member_id
             and sender.deleted_at is not null
        )
        and not exists (
          select 1
            from members recipient
           where recipient.id = collaboration_requests.recipient_member_id
             and recipient.deleted_at is not null
        )`,
  );

  console.log(
    `Lifecycle sweep complete: ${inactive.rowCount} reminders, ${finalWarnings.rowCount} warnings, ${due.rowCount} account deletions, ${retainedIds.rowCount} ID purges, ${purgedRequests.rowCount} expired sent requests.`,
  );
}

try {
  await runLifecycleSweep();
  if (process.argv.includes("--once")) {
    await pool.end();
  } else {
    setInterval(() => {
      runLifecycleSweep().catch((error) => console.error("Lifecycle sweep failed", error));
    }, 24 * 60 * 60 * 1000);
  }
} catch (error) {
  console.error("Lifecycle worker failed", error);
  await pool.end();
  process.exit(1);
}
