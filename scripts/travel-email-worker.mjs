import pg from "pg";
import nodemailer from "nodemailer";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const mail = nodemailer.createTransport({ host: process.env.SMTP_HOST ?? "localhost", port: Number(process.env.SMTP_PORT ?? 1025), secure: false, connectionTimeout: 10000, socketTimeout: 10000 });
async function deliver() {
  for (let count = 0; count < 50; count++) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows: [job] } = await client.query("select * from travel_email_outbox where sent_at is null and attempts < 5 and next_attempt_at <= now() order by created_at for update skip locked limit 1");
      if (!job) { await client.query("commit"); break; }
      try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        await mail.sendMail({ from: process.env.EMAIL_FROM ?? "Model Escape <verify@modelescape.local>", to: job.email, subject: `Travel instructions updated: ${job.title}`, text: `The host has updated the flying instructions for ${job.title}.\n\nReview the latest airport, arrival, transfer and pickup guidance before traveling:\n${origin}/events/${encodeURIComponent(job.slug)}#travel\n\nYour private submitted itinerary is not included in this email.` });
        await client.query("update travel_email_outbox set sent_at=now(), attempts=attempts+1 where id=$1", [job.id]);
      } catch {
        await client.query("update travel_email_outbox set attempts=attempts+1, next_attempt_at=now() + interval '2 minutes' * (attempts+1) where id=$1", [job.id]);
        console.warn("Travel update email queued for retry.");
      }
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  }
}
if (process.argv.includes("--once")) { try { await deliver(); } finally { await pool.end(); } }
else { let running = false; async function tick() { if (running) return; running = true; try { await deliver(); } catch { console.error("Travel email delivery unavailable; retrying on next cycle."); } finally { running = false; } } await tick(); setInterval(tick, 30000); }
