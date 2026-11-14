import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import pg from "pg";
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Local-only integration check.");
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 1 });
const eventId = randomUUID(), hostId = randomUUID(), paidId = randomUUID(), otherId = randomUUID(), pendingId = randomUUID();
const participants = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const slug = `travel-check-${eventId}`;
const tokens = Object.fromEntries([hostId, paidId, otherId, pendingId].map(id => [id, randomBytes(32).toString("base64url")]));
const hash = value => createHash("sha256").update(value).digest("hex");
let checks = 0;
async function check(label, fn) { await fn(); checks++; console.log(`PASS ${label}`); }
async function call(id, method, body, memberId, extra = {}) {
  const url = method === "PATCH" ? `/api/host/events/${id}` : `/api/events/${id}/flights${method === "GET" && memberId === paidId ? "?mine=1" : ""}`;
  const r = await fetch(`${origin}${url}`, { method, headers: { "content-type": "application/json", ...(memberId ? { cookie: `model_escape_session=${tokens[memberId]}` } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, headers: r.headers, data: await r.json() };
}
const paths = [{ type: "model", enabled: true, title: "Model", description: "Test", priceCents: 10000, capacity: 10, approvalRequired: false }];
const payload = { title: "Travel integration fixture", category: "Destination photoshoot", location: "Phoenix, AZ, United States", countryCode: "US", stateCode: "AZ", city: "Phoenix", summary: "Travel fixture", startsAt: "2027-12-01T09:00", endsAt: "2027-12-03T17:00", capacity: 10, spotsRemaining: 5, costDollars: 100, refundDaysBefore: 60, participationPaths: paths, imagePath: "/images/desert-production.png", isPublished: true };
const flight = { airline: "QA Air", flightNumber: "QA123", arrivalLocal: "2027-12-01T12:00", departureLocal: "2027-12-03T18:00", timezone: "America/Phoenix", notes: "Private test itinerary" };
try {
  for (const [id, role] of [[hostId, "host"], [paidId, "model"], [otherId, "model"], [pendingId, "model"]]) {
    await pool.query("insert into members(id,email,username,name,password_hash,primary_role,home_market,email_verified_at,admin_approved_at) values($1,$2,$3,$4,'unused',$5,'Phoenix, AZ, United States',now(),now())", [id, `travel-${id}@example.test`, `travel-${id}`, `Travel fixture ${role} ${id.slice(0,4)}`, role]);
    await pool.query("insert into member_sessions(member_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')", [id, hash(tokens[id])]);
  }
  await pool.query("insert into events(id,owner_id,slug,title,category,location,country_code,state_code,city,summary,starts_at,ends_at,capacity,spots_remaining,participation_paths) values($1,$2,$3,$4,$5,$6,'US','AZ','Phoenix',$7,$8,$9,10,5,$10)", [eventId, hostId, slug, payload.title, payload.category, payload.location, payload.summary, payload.startsAt, payload.endsAt, JSON.stringify(paths)]);
  const guestToken = randomBytes(32).toString("base64url");
  const fixtureRows = [[participants[0], paidId, "confirmed", "model"], [participants[1], otherId, "confirmed", "model"], [participants[2], pendingId, "pending", "model"], [participants[3], null, "confirmed", "attendee"]];
  for (const [id, member, status, role] of fixtureRows) await pool.query("insert into event_participations(id,event_id,member_id,path_type,status,applicant_name,applicant_email,price_cents,guest_access_token_hash) values($1,$2,$3,$4,$5,$6,$7,10000,$8)", [id, eventId, member, role, status, `Fixture ${id}`, `travel-${member ?? id}@example.test`, member ? null : hash(guestToken)]);
  for (const index of [0,2,3]) await pool.query("insert into event_transactions(event_id,participation_id,member_id,host_member_id,confirmation_code,gross_cents,platform_fee_cents,host_net_cents) values($1,$2,$3,$4,$5,10000,200,9800)", [eventId, participants[index], fixtureRows[index][1], hostId, `TST00${index}`]);
  for (const id of [paidId, otherId, pendingId]) await pool.query("insert into profiles(member_id,slug,name,role,location,image_path) values($1,$2,$3,'model','Phoenix','/images/placeholders/model_placeholder.png')", [id, `travel-${id}`, `Travel model ${id}`]);
  await check("anonymous and unrelated viewers cannot read itineraries", async () => { assert.equal((await call(eventId,"GET")).status,403); assert.equal((await call(eventId,"GET",null,otherId)).status,403); });
  await check("unpaid and pending attendees cannot submit private flight details", async () => { assert.equal((await call(eventId,"PUT",flight,otherId)).status,403); assert.equal((await call(eventId,"PUT",flight,pendingId)).status,403); });
  await check("confirmed paid attendee can submit, reload, and update one itinerary", async () => { assert.equal((await call(eventId,"PUT",flight,paidId)).status,200); const r=await call(eventId,"GET",null,paidId); assert.equal(r.status,200); assert.match(r.headers.get("cache-control"),/no-store/); assert.equal(r.data.items.length,1); assert.equal(r.data.items[0].notes,flight.notes); assert.equal((await call(eventId,"PUT",{...flight,notes:"Changed private note"},paidId)).status,200); });
  await check("invalid dates and timezones are rejected", async () => { assert.equal((await call(eventId,"PUT",{...flight,arrivalLocal:"2027-02-31T12:00"},paidId)).status,400); assert.equal((await call(eventId,"PUT",{...flight,timezone:"Bad timezone"},paidId)).status,400); });
  await check("event host sees submissions but cannot edit an attendee itinerary", async () => { const r=await call(eventId,"GET",null,hostId); assert.equal(r.data.items.length,1); assert.equal((await call(eventId,"PUT",flight,hostId)).status,403); });
  await check("guest pass uses a private token to submit its own itinerary", async () => { const h={"x-guest-booking":participants[3],"x-guest-token":guestToken}; assert.equal((await call(eventId,"PUT",flight,undefined,h)).status,200); assert.equal((await call(eventId,"GET",null,undefined,h)).data.items.length,1); assert.equal((await call(eventId,"GET",null,undefined,{...h,"x-guest-token":"invalid"})).status,403); });
  await check("non-owner cannot change event travel guidance",async()=>{ assert.equal((await call(eventId,"PATCH",payload,paidId)).status,401); });
  const travelDetails={airportName:"Test airport",airportCode:"PHX",arrivalWindow:"10 AM–3 PM",timezone:"America/Phoenix",transferDetails:"Prebooked shuttle",pickupLocation:"Meeting point",hostContact:"Travel desk"};
  await check("travel updates save and notify only paid confirmed bookings", async () => { const r=await call(eventId,"PATCH",{...payload,travelDetails,airportInfo:"Legacy notes",flightInstructions:"Arrive in the stated window"},hostId); assert.equal(r.status,200,JSON.stringify(r.data)); const q=await pool.query("select count(*)::int n from travel_email_outbox where event_id=$1",[eventId]); assert.equal(q.rows[0].n,2); const notices=await pool.query("select member_id from member_notifications where resource_id=$1 and type='event_travel_updated'",[eventId]); assert.deepEqual(notices.rows.map(r=>r.member_id),[paidId]); });
  await check("unchanged travel guidance does not send duplicate notifications",async()=>{ assert.equal((await call(eventId,"PATCH",{...payload,travelDetails,airportInfo:"Legacy notes",flightInstructions:"Arrive in the stated window"},hostId)).status,200); assert.equal((await pool.query("select count(*)::int n from travel_email_outbox where event_id=$1",[eventId])).rows[0].n,2); });
  await check("public event and mobile details never contain private itineraries; lineup is paid and confirmed",async()=>{const r=await fetch(`${origin}/api/mobile/events/${eventId}`);const text=await r.text();assert.equal(r.status,200);assert.doesNotMatch(text,/Changed private note|QA123/);const data=JSON.parse(text);assert.equal(data.event.attendingModels.length,1);assert.equal(data.event.attendingModels[0].memberId,paidId);});
  await check("email worker delivers queued travel updates",async()=>{ execFileSync(process.execPath,["scripts/travel-email-worker.mjs","--once"],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:connectionString,NEXT_PUBLIC_SITE_URL:origin},stdio:"pipe"}); assert.equal((await pool.query("select count(*)::int n from travel_email_outbox where event_id=$1 and sent_at is not null",[eventId])).rows[0].n,2); });
  await check("attendees can remove their own shared itinerary",async()=>{ assert.equal((await call(eventId,"DELETE",undefined,paidId)).status,200); assert.equal((await call(eventId,"GET",null,paidId)).data.items.length,0); });
  console.log(`${checks} travel workflow checks passed.`);
} finally {
  await pool.query("delete from member_notifications where resource_id=$1",[eventId]);
  await pool.query("delete from events where id=$1",[eventId]);
  await pool.query("delete from members where id=any($1::uuid[])",[[hostId,paidId,otherId,pendingId]]);
  await pool.end();
}
