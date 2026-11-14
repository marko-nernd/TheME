import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import Stripe from "stripe";

// Local-only fixtures. Existing members, events, passwords and payments are never edited.
try { process.loadEnvFile(".env"); } catch { /* The container supplies environment variables directly. */ }
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Local-only check.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const people = ["host", "model", "photographer", "host", "model"].map((role) => ({ id: randomUUID(), token: randomBytes(32).toString("base64url"), role }));
const [host, model, photographer, outsider, otherModel] = people;
const eventIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const [currentEvent, refundEvent, lastSeatEvent, endedEvent] = eventIds;
const stripeIntents = new Set();
const hash = (value) => createHash("sha256").update(value).digest("hex");
let passed = 0;
async function call(path, method = "GET", body, person = model) {
  const response = await fetch(`${origin}${path}`, { method, redirect: "manual", headers: { "content-type": "application/json", ...(person ? { cookie: `model_escape_session=${person.token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text();
  let result; try { result = JSON.parse(raw); } catch { result = raw; }
  return { status: response.status, result, headers: response.headers };
}
async function check(label, run) { await run(); passed++; console.log(`PASS ${label}`); }
async function paidFixture(eventId, person, code) {
  const id = randomUUID(), paymentId = randomUUID();
  await pool.query("insert into event_participations(id,event_id,member_id,path_type,status,applicant_name,applicant_email,price_cents) values($1,$2,$3,$4,'confirmed','Event-pass fixture',$5,10000)", [id, eventId, person.id, person.role, `pass-${person.id}@example.test`]);
  await pool.query("insert into event_transactions(id,event_id,participation_id,member_id,host_member_id,confirmation_code,gross_cents,platform_fee_cents,processing_fee_cents,customer_fee_cents,host_net_cents,status) values($1,$2,$3,$4,$5,$6,10500,200,300,500,10000,'paid')", [paymentId, eventId, id, person.id, host.id, code]);
  const { rows: [row] } = await pool.query("select check_in_token from event_participations where id=$1", [id]);
  return { id, paymentId, code, qr: `MEPASS:${id}:${row.check_in_token}` };
}
try {
  for (const person of people) {
    await pool.query("insert into members(id,email,username,name,password_hash,primary_role,home_market,email_verified_at,admin_approved_at) values($1,$2,$3,'Event-pass check','unused',$4,'Phoenix, AZ, United States',now(),now())", [person.id, `pass-${person.id}@example.test`, `pass-${person.id}`, person.role]);
    await pool.query("insert into member_sessions(member_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')", [person.id, hash(person.token)]);
  }
  const paths = ["model", "photographer", "attendee"].map((type) => ({ type, title: type, description: "Test fixture", enabled: true, capacity: 10, priceCents: 10000, approvalRequired: false }));
  for (const id of eventIds) await pool.query("insert into events(id,owner_id,slug,title,category,location,summary,starts_at,ends_at,capacity,spots_remaining,refund_days_before,participation_paths) values($1,$2,$3,'Event-pass integration check','Photoshoot','Phoenix, AZ, United States','Temporary test only',now()-interval '1 hour',now()+interval '1 hour',30,30,60,$4)", [id, host.id, `pass-${id}`, JSON.stringify(paths)]);
  await pool.query("update events set starts_at=now()+interval '90 days',ends_at=now()+interval '91 days' where id=$1", [refundEvent]);
  await pool.query("update events set starts_at=now()-interval '2 days',ends_at=now()-interval '1 day' where id=$1", [endedEvent]);
  await pool.query("update events set participation_paths=$1 where id=$2", [JSON.stringify([{ ...paths[2], capacity: 1, priceCents: 0 }]), lastSeatEvent]);
  const pass = await paidFixture(currentEvent, model, "CHK123");
  const photoPass = await paidFixture(currentEvent, photographer, "PHO123");
  const refundable = await paidFixture(refundEvent, model, "REF123");
  await check("private passes redirect anonymous visitors to sign-in", async () => { assert.equal((await call(`/passes/${pass.id}`, "GET", undefined, null)).status, 307); });
  await check("another member cannot see a pass or calendar", async () => { assert.equal((await call(`/passes/${pass.id}`, "GET", undefined, photographer)).status, 404); assert.equal((await call(`/passes/${pass.id}/calendar`, "GET", undefined, photographer)).status, 404); });
  await check("owner pass contains QR, dates, directions and current status", async () => { const r = await call(`/passes/${pass.id}`); assert.equal(r.status, 200); for (const text of ["CHK123", "Add to calendar", "Directions", "Refund policy"]) assert.ok(r.result.includes(text), text); });
  await check("calendar is private and does not leak QR credentials", async () => { const r = await call(`/passes/${pass.id}/calendar`); assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /text\/calendar/); assert.match(r.headers.get("cache-control"), /no-store/); assert.match(r.result, /BEGIN:VCALENDAR/); assert.ok(!r.result.includes(pass.qr.split(":")[2])); });
  await check("check-in requires a signed-in event owner", async () => { assert.equal((await call(`/api/host/events/${currentEvent}/check-in`, "GET", undefined, null)).status, 401); assert.equal((await call(`/api/host/events/${currentEvent}/check-in`, "POST", { code: pass.qr }, outsider)).status, 404); });
  await check("forged QR tokens cannot check in", async () => { assert.equal((await call(`/api/host/events/${currentEvent}/check-in`, "POST", { code: `MEPASS:${pass.id}:${randomUUID()}` }, host)).status, 404); });
  await check("concurrent scans admit a paid attendee exactly once", async () => { const results = await Promise.all([1, 2].map(() => call(`/api/host/events/${currentEvent}/check-in`, "POST", { code: pass.qr }, host))); assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]); });
  await check("confirmation-code fallback checks in a photographer", async () => { assert.equal((await call(`/api/host/events/${currentEvent}/check-in`, "POST", { code: photoPass.code }, host)).status, 200); });
  await check("a refund-pending payment cannot be used for entry", async () => { await pool.query("update event_transactions set status='refund_pending' where id=$1", [photoPass.paymentId]); assert.equal((await call(`/api/host/events/${currentEvent}/check-in`, "POST", { code: photoPass.qr }, host)).status, 404); });
  await check("checked-in attendees cannot be reported as no-shows", async () => { await pool.query("update events set ends_at=now()-interval '1 minute' where id=$1", [currentEvent]); const r = await call("/api/reviews", "POST", { eventId: currentEvent, reviewedMemberId: model.id, overallRating: 1, reliabilityRating: 1, professionalismRating: 1, noShow: true, comment: "This false no-show report must be blocked by check-in evidence." }, host); assert.equal(r.status, 403); });
  await check("only the payment owner sees refund eligibility", async () => { const r = await call(`/api/event-transactions/${refundable.paymentId}/refund`); assert.equal(r.status, 200); assert.equal(r.result.eligible, true); assert.equal((await call(`/api/event-transactions/${refundable.paymentId}/refund`, "GET", undefined, photographer)).status, 404); });
  let refundId;
  await check("refund requests are single per payment and do not cancel attendance", async () => { const path = `/api/event-transactions/${refundable.paymentId}/refund`; assert.equal((await call(path, "POST", { reason: "I cannot travel on the event dates." })).status, 201); assert.equal((await call(path, "POST", { reason: "Duplicate request should be refused." })).status, 409); const { rows: [row] } = await pool.query("select r.id,p.status from event_refund_requests r join event_transactions t on t.id=r.transaction_id join event_participations p on p.id=t.participation_id where t.id=$1", [refundable.paymentId]); refundId = row.id; assert.equal(row.status, "confirmed"); });
  await check("another host cannot decide a refund", async () => { assert.equal((await call(`/api/host/refunds/${refundId}`, "PATCH", { action: "deny", note: "This is not my event." }, outsider)).status, 404); });
  await check("host refund decision saves a visible explanation", async () => { assert.equal((await call(`/api/host/refunds/${refundId}`, "PATCH", { action: "deny", note: "Please contact us to adjust your dates." }, host)).status, 200); const r = await call(`/api/event-transactions/${refundable.paymentId}/refund`); assert.equal(r.result.request.status, "denied"); assert.match(r.result.request.decisionNote, /adjust your dates/); });
  await check("check-in cannot open three months early", async () => { assert.equal((await call(`/api/host/events/${refundEvent}/check-in`, "POST", { code: refundable.qr }, host)).status, 409); });
  await check("only one of eight simultaneous last-seat bookings succeeds", async () => { const results = await Promise.all(Array.from({ length: 8 }, (_, i) => call("/api/event-participations", "POST", { eventId: lastSeatEvent, pathType: "attendee", applicantName: `Fixture guest ${i}`, applicantEmail: `guest-${lastSeatEvent}-${i}@example.test` }, null))); assert.equal(results.filter((r) => r.status === 201).length, 1, JSON.stringify(results.map((r) => r.status))); assert.equal(results.filter((r) => r.status === 409).length, 7); const booking = results.find((r) => r.status === 201).result; const url = `/passes/${booking.participation.id}?token=${encodeURIComponent(booking.guestToken)}`; assert.equal((await call(url, "GET", undefined, null)).status, 200); assert.equal((await call(`/passes/${booking.participation.id}?token=wrong`, "GET", undefined, null)).status, 404); });
  await check("ended events do not accept new bookings", async () => { assert.equal((await call("/api/event-participations", "POST", { eventId: endedEvent, pathType: "model" })).status, 409); });
  await check("test payout settings are host-scoped and do not auto-create an account", async () => { assert.equal((await call("/api/host/payouts", "GET", undefined, model)).status, 401); const r = await call("/api/host/payouts", "GET", undefined, host); assert.equal(r.status, 200); assert.equal(r.result.account, null); const { rows: [row] } = await pool.query("select count(*)::int as count from host_payout_accounts where member_id=$1", [host.id]); assert.equal(row.count, 0); });
  await check("canceling attendance deactivates the pass without inventing a refund", async () => { assert.equal((await call(`/api/event-participations/${pass.id}/withdraw`, "PATCH", { reason: "I can no longer attend this event." })).status, 200); const r = await call(`/passes/${pass.id}`); assert.match(r.result, /Pass inactive/); const { rows: [row] } = await pool.query("select status from event_transactions where id=$1", [pass.paymentId]); assert.equal(row.status, "paid"); });
  if (process.env.CHECK_STRIPE_TEST === "1") {
    if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("Stripe check requires a test key.");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let bookingId, intentId;
    await check("repeated checkout reuses one test PaymentIntent", async () => { const book = await call("/api/event-participations", "POST", { eventId: refundEvent, pathType: "model" }, otherModel); assert.equal(book.status, 201); bookingId = book.result.participation.id; const a = await call(`/api/event-participations/${bookingId}/checkout`, "POST", {}, otherModel); assert.equal(a.status, 200, JSON.stringify(a.result)); intentId = a.result.clientSecret.split("_secret_")[0]; stripeIntents.add(intentId); const b = await call(`/api/event-participations/${bookingId}/checkout`, "POST", {}, otherModel); assert.equal(b.status, 200); assert.equal(a.result.clientSecret, b.result.clientSecret); const intent = await stripe.paymentIntents.retrieve(intentId); assert.equal(intent.livemode, false); assert.equal(intent.amount, a.result.amountCents); });
    await check("canceling an unpaid booking cancels the test intent before releasing the place", async () => { assert.equal((await call(`/api/event-participations/${bookingId}/withdraw`, "PATCH", { reason: "Cancel this test checkout safely." }, otherModel)).status, 200); assert.equal((await stripe.paymentIntents.retrieve(intentId)).status, "canceled"); });
  }
  console.log(`${passed} event-pass integration checks passed. No live payments or real payouts were made.`);
} finally {
  if (stripeIntents.size && process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    for (const id of stripeIntents) { const intent = await stripe.paymentIntents.retrieve(id); if (!intent.livemode && !["succeeded", "canceled"].includes(intent.status)) await stripe.paymentIntents.cancel(id); }
  }
  await pool.query("delete from events where id=any($1::uuid[])", [eventIds]);
  await pool.query("delete from members where id=any($1::uuid[])", [people.map((person) => person.id)]);
  await pool.end();
}
