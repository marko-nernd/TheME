import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the shared workspace theme is loaded for every application route", async () => {
  const [layout, css] = await Promise.all([read("app/layout.tsx"), read("app/platform-ux.css")]);
  assert.match(layout, /import "\.\/platform-ux.css"/);
  assert.match(layout, /body className="platform-ui"/);
  assert.match(css, /@media screen/);
  assert.match(css, /--workspace-canvas: #141519/);
  assert.match(css, /--workspace-panel: #202127/);
  for (const component of ["home-cinematic", "page-hero", "auth-panel", "signup-wizard", "wizard-intro", "join-event-layout", "member-profile-intro", "dashboard-tabs", "sponsor-marketplace", "membership-page"]) {
    assert.ok(css.includes(component), `${component} uses shared visual styling`);
  }
});

test("dashboard navigation has desktop and mobile layouts without changing tab behavior", async () => {
  const [css, tabs] = await Promise.all([read("app/platform-ux.css"), read("components/dashboard-tabs.tsx")]);
  assert.match(css, /grid-template-columns: 212px minmax\(0,1fr\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /dashboard-local-nav button\[aria-selected="true"\]/);
  assert.match(tabs, /aria-controls=\{`dashboard-panel-/);
  assert.match(tabs, /window.history.replaceState/);
});

test("theme migration retains custom branding and does not seed or reset accounts", async () => {
  const sql = await read("drizzle/0066_shared_workspace_theme.sql");
  assert.match(sql, /dark_color = '#141519' WHERE dark_color = '#0b0b0c'/);
  assert.match(sql, /button_radius = '8' WHERE button_radius = '0'/);
  assert.doesNotMatch(sql, /\b(?:DELETE|TRUNCATE|DROP|INSERT)\b/i);
  for (const line of sql.split("\n").filter((line) => line.startsWith("UPDATE"))) assert.ok(line.includes(" WHERE "));
});

test("embedded payments share the new fields and readable label styling", async () => {
  const appearance = await read("lib/stripe-appearance.ts");
  assert.match(appearance, /theme: "night"/);
  assert.match(appearance, /borderRadius: value\("--button-radius", "8px"\)/);
  assert.match(appearance, /fontSize: "14px"/);
  assert.match(appearance, /#17181d/);
});
