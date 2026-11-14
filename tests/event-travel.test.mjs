import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const compiled = ts.transpileModule(await read("lib/event-travel-fields.ts"), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { parseEventTravel, travelFingerprint } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
test("travel fields validate airport code and destination timezone", () => {
  assert.equal(parseEventTravel({ airportCode: "sjo", timezone: "America/Costa_Rica" }).airportCode, "SJO");
  assert.throws(() => parseEventTravel({ airportCode: "INVALID" }), /INVALID_TRAVEL/);
  assert.throws(() => parseEventTravel({ timezone: "Not a timezone" }), /INVALID_TRAVEL/);
  assert.throws(() => parseEventTravel({ pickupLocation: "x".repeat(501) }), /INVALID_TRAVEL/);
});
test("travel change comparison ignores key order, trimming and unrelated event edits", () => {
  assert.equal(travelFingerprint({ travelDetails: { airportCode: "SJO", airportName: " Airport " } }), travelFingerprint({ travelDetails: { airportName: "Airport", airportCode: "sjo" } }));
  assert.notEqual(travelFingerprint({ flightInstructions: "Original" }), travelFingerprint({ flightInstructions: "Changed" }));
});
test("private flights require a confirmed booking with payment when payable", async () => {
  const [access, api, query, update, worker] = await Promise.all([read("lib/attendee-flights.ts"), read("app/api/events/[id]/flights/route.ts"), read("db/queries.ts"), read("lib/update-event-travel.ts"), read("scripts/travel-email-worker.mjs")]);
  assert.match(access, /p.status='confirmed'/);
  assert.match(access, /t.status='paid'/);
  assert.match(api, /private, no-store/);
  assert.match(api, /if \(!allowed\?\.booking\)/);
  assert.match(query, /paid.status = 'paid' and paid.gross_cents > 0/);
  assert.match(update, /\.for\("update"\)/);
  assert.match(update, /travelFingerprint\(before\) !== travelFingerprint\(after\)/);
  assert.match(update, /tx.insert\(memberNotifications\)/);
  assert.match(update, /tx.insert\(travelEmailOutbox\)/);
  assert.match(worker, /for update skip locked/);
});
