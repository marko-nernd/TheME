import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("event travel dropdown supports structured or legacy instructions without requiring a passport", async () => {
  const [popup, page] = await Promise.all([read("components/event-flight-instructions.tsx"), read("app/events/[slug]/page.tsx")]);
  assert.match(popup, /!hasTravelDetails\(travelDetails\)\) return null/);
  assert.match(popup, /<details className="event-flight-dropdown"/);
  assert.match(popup, /event.key === "Escape"/);
  assert.match(popup, /querySelector\("summary"\)\?\.focus\(\)/);
  assert.match(popup, /<PlaneIcon/);
  assert.doesNotMatch(popup, /dangerouslySetInnerHTML/);
  assert.match(page, /<EventFlightInstructions\b[^>]*title=\{event.title\}/);
  assert.doesNotMatch(page, /event.passportRequired && \(event.airportInfo/);
});

test("account menu highlighted actions use white text on the pink accent", async () => {
  const css = await read("app/cinematic.css");
  assert.match(css, /\.account-menu-popover :is\(a, button, summary\):is\(:hover, :focus-visible\) \{ background: var\(--accent, #ff2d95\); color: #fff;/);
});
