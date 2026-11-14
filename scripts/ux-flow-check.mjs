import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

// Creates only isolated test fixtures, and removes those exact IDs in finally.
// Existing member passwords, events, and billing records are never changed.
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("This check is local-only.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const memberId = randomUUID(), otherId = randomUUID(), sponsorId = randomUUID();
const eventId = randomUUID();
const token = randomBytes(32).toString("base64url"), resetToken = randomBytes(32).toString("base64url");
const email = `ux-check-${memberId}@example.test`;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const cookie = `model_escape_session=${token}`;
let checks = 0;
async function call(path, method = "GET", body, authenticated = true) {
  const response = await fetch(`${origin}${path}`, { method, headers: { "content-type": "application/json", ...(authenticated ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: "manual" });
  const text = await response.text();
  let result; try { result = JSON.parse(text); } catch { result = text; }
  return { status: response.status, result };
}
async function check(label, run) { await run(); checks++; console.log(`PASS ${label}`); }
try {
  await pool.query("insert into members(id,email,username,name,password_hash,primary_role,home_market,country_code,state_code,city,email_verified_at,admin_approved_at) values ($1,$2,$3,'UX test sponsor','unused','sponsor','Phoenix, AZ, United States','US','AZ','Phoenix',now(),now()),($4,$5,$6,'Other UX fixture','unused','host','Phoenix, AZ, United States','US','AZ','Phoenix',now(),now())", [memberId, email, `ux-${memberId}`, otherId, `ux-check-${otherId}@example.test`, `ux-${otherId}`]);
  await pool.query("insert into sponsors(id,slug,name,category,contact_email,description,website_url) values ($1,$3,'Original company','Original category',$2,'Original bio','https://example.test/original')", [sponsorId, email, `ux-${sponsorId}`]);
  await pool.query("insert into sponsor_members(member_id,sponsor_id) values($1,$2)", [memberId, sponsorId]);
  await pool.query("insert into member_sessions(member_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')", [memberId, hash(token)]);
  const ownNotice = randomUUID(), otherNotice = randomUUID();
  await pool.query("insert into member_notifications(id,member_id,type,title,message) values($1,$2,'test','Test notice','Your notice'),($3,$4,'test','Other notice','Private notice')", [ownNotice, memberId, otherNotice, otherId]);
  await check("notification endpoints require sign-in", async () => { assert.equal((await call("/api/account/notifications", "GET", undefined, false)).status, 401); });
  await check("unread list and count are member-scoped", async () => { const r = await call("/api/account/notifications"); assert.equal(r.status, 200); assert.equal(r.result.unreadCount, 1); assert.equal(r.result.items.length, 1); assert.equal(r.result.items[0].id, ownNotice); });
  await check("cannot dismiss another member's notification", async () => { assert.equal((await call("/api/account/notifications", "PATCH", { ids: [otherNotice] })).status, 200); const { rows } = await pool.query("select read_at from member_notifications where id=$1", [otherNotice]); assert.equal(rows[0].read_at, null); });
  await check("mark-all clears only own unread notifications", async () => { await call("/api/account/notifications", "PATCH", { all: true }); assert.equal((await call("/api/account/notifications")).result.unreadCount, 0); const { rows } = await pool.query("select read_at from member_notifications where id=$1", [otherNotice]); assert.equal(rows[0].read_at, null); });
  await check("sponsor sections save independently", async () => {
    const r = await call("/api/account/profile", "PATCH", { sponsorSection: "contact", contactName: "Updated contact", contactPhone: "555-0100", name: "Stale name", organization: "Stale company", bio: "Stale bio", profileIdentifier: "stale-handle" });
    assert.equal(r.status, 200, JSON.stringify(r.result));
    const { rows } = await pool.query("select s.name,s.description,s.contact_name,m.name as member_name from sponsors s join sponsor_members sm on sm.sponsor_id=s.id join members m on m.id=sm.member_id where m.id=$1", [memberId]);
    assert.equal(rows[0].contact_name, "Updated contact"); assert.equal(rows[0].name, "Original company"); assert.equal(rows[0].description, "Original bio"); assert.equal(rows[0].member_name, "UX test sponsor");
  });
  await check("membership rejects the wrong account type before charging", async () => { assert.equal((await call("/api/billing/checkout", "POST", { plan: "creator" })).status, 400); });
  for (const role of ["model", "photographer", "host", "sponsor"]) {
    await pool.query("update members set primary_role=$1 where id=$2", [role, memberId]);
    await check(`${role} dashboard and role-specific plans render`, async () => {
      for (const path of ["/dashboard", "/membership", ...(role === "sponsor" ? ["/membership/sponsor"] : [])]) {
        const r = await call(path); assert.equal(r.status, 200, `${path} failed`); assert.doesNotMatch(r.result, /Application error|Internal Server Error/);
      }
    });
  }
  await pool.query("update members set primary_role='model' where id=$1", [memberId]);
  const paths = ["model", "photographer", "attendee"].map((type) => ({ type, enabled: true, title: type, description: "UX fixture", priceCents: 10000, capacity: 10, approvalRequired: false }));
  await pool.query("insert into events(id,owner_id,slug,title,category,location,summary,starts_at,ends_at,capacity,spots_remaining,participation_paths,villa_available,villa_model_price_cents,villa_model_spots) values($1,$2,$3,'UX checkout fixture','Photoshoot','Phoenix, AZ, United States','Integration test only',now()+interval '7 days',now()+interval '8 days',30,30,$4,true,3000,4)", [eventId, otherId, `ux-${eventId}`, JSON.stringify(paths)]);
  let bookingId;
  await check("booking includes accommodation and one combined service fee", async () => {
    const r = await call("/api/event-participations", "POST", { eventId, pathType: "model", accommodationType: "villa" });
    assert.equal(r.status, 201, JSON.stringify(r.result)); assert.equal(r.result.participation.status, "awaiting_payment");
    assert.equal(r.result.quote.baseAmountCents, 13000); assert.equal(r.result.stayCents, 3000); assert.equal(r.result.quote.totalCents, r.result.quote.baseAmountCents + r.result.quote.customerFeeCents);
    bookingId = r.result.participation.id;
  });
  await check("repeat booking resumes the same saved quote without duplicating", async () => {
    const r = await call("/api/event-participations", "POST", { eventId, pathType: "model", accommodationType: "" });
    assert.equal(r.status, 200); assert.equal(r.result.participation.id, bookingId); assert.equal(r.result.resumed, true); assert.equal(r.result.accommodationType, "villa"); assert.equal(r.result.quote.baseAmountCents, 13000);
    const { rows } = await pool.query("select count(*)::int as total from event_participations where event_id=$1 and member_id=$2", [eventId, memberId]); assert.equal(rows[0].total, 1);
  });
  await check("model account cannot book through the photographer path", async () => { assert.equal((await call("/api/event-participations", "POST", { eventId, pathType: "photographer" })).status, 403); });
  await check("existing guest booking recovery sends private access by email", async () => {
    const body = { eventId, pathType: "attendee", applicantName: "UX guest fixture", applicantEmail: `guest-${eventId}@example.test` };
    const first = await call("/api/event-participations", "POST", body, false); assert.equal(first.status, 201); assert.ok(first.result.guestToken);
    const second = await call("/api/event-participations", "POST", body, false); assert.equal(second.status, 200); assert.equal(second.result.emailAccessSent, true); assert.equal(second.result.guestToken, undefined); assert.equal(second.result.participation, undefined);
  });
  await check("recovery returns the same response for unknown accounts", async () => { const r = await call("/api/auth/recovery", "POST", { action: "password", email: `missing-${randomUUID()}@example.test` }, false); assert.equal(r.status, 200); assert.equal(r.result.ok, true); });
  await check("recovery email requests are throttled", async () => {
    for (let i = 0; i < 2; i++) assert.equal((await call("/api/auth/recovery", "POST", { action: "password", email }, false)).status, 200);
    const { rows } = await pool.query("select count(*)::int as total from account_recovery_tokens where member_id=$1 and purpose='password'", [memberId]); assert.equal(rows[0].total, 1);
  });
  await pool.query("insert into account_recovery_tokens(member_id,purpose,token_hash,expires_at) values($1,'password',$2,now()+interval '1 hour')", [memberId, hash(resetToken)]);
  await check("reset is single-use, changes the password and revokes sessions", async () => {
    const payload = { action: "reset", token: resetToken, password: "UX-fixture-only-password-4829" };
    assert.equal((await call("/api/auth/recovery", "POST", payload, false)).status, 200);
    assert.equal((await call("/api/auth/recovery", "POST", payload, false)).status, 400);
    assert.equal((await call("/api/account/notifications")).status, 401);
    const { rows } = await pool.query("select password_hash from members where id=$1", [memberId]); assert.notEqual(rows[0].password_hash, "unused");
    const login = await call("/api/auth/login", "POST", { credential: email, password: payload.password }, false); assert.equal(login.status, 200);
  });
  await check("expired reset links cannot change a password", async () => {
    const expired = randomBytes(32).toString("base64url");
    await pool.query("insert into account_recovery_tokens(member_id,purpose,token_hash,expires_at) values($1,'password',$2,now()-interval '1 minute')", [memberId, hash(expired)]);
    assert.equal((await call("/api/auth/recovery", "POST", { action: "reset", token: expired, password: "Must-not-be-applied-4829" }, false)).status, 400);
  });
  console.log(`${checks} UX integration checks passed.`);
} finally {
  await pool.query("delete from events where id=$1", [eventId]);
  await pool.query("delete from sponsors where id=$1", [sponsorId]);
  await pool.query("delete from members where id=any($1::uuid[])", [[memberId, otherId]]);
  await pool.end();
}
