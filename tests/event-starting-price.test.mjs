import assert from "node:assert/strict";
import test from "node:test";
import { eventStartingPriceCents, eventStartingPriceLabel } from "../lib/event-starting-price.ts";
const path = (type, priceCents, enabled = true) => ({ type, priceCents, enabled });
test("starting price uses selected tickets rather than a stale event price", () => {
  assert.equal(eventStartingPriceCents({ priceCents: 5000, participationPaths: [path("model", 25000), path("photographer", 35000), path("attendee", 5000, false)] }), 25000);
});
test("enabled guest tickets count, sponsorships and disabled prices do not", () => {
  assert.equal(eventStartingPriceCents({ priceCents: 5000, participationPaths: [path("model", 25000), path("attendee", 8000), path("sponsor", 100)] }), 8000);
});
test("free, application-only and legacy events have accurate labels", () => {
  assert.equal(eventStartingPriceLabel({ priceCents: 5000, participationPaths: [path("model", 0)] }), "Free");
  assert.equal(eventStartingPriceLabel({ priceCents: 5000, participationPaths: [path("model", 25000, false), path("sponsor", 1000)] }), "Application only");
  assert.equal(eventStartingPriceCents({ priceCents: 12345, participationPaths: [] }), 12345);
});
