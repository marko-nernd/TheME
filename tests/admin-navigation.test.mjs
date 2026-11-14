import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin navigation is grouped, searchable, and survives refresh and browser history", async () => {
  const source = await read("app/admin/workspace.tsx");
  for (const group of ["Workspace", "Manage", "Website", "Operations"]) assert.ok(source.includes(`group: "${group}"`));
  assert.match(source, /Find a section/);
  assert.match(source, /window.history.pushState/);
  assert.match(source, /window.addEventListener\("popstate", syncSection\)/);
  assert.match(source, /window.addEventListener\("hashchange", syncSection\)/);
  assert.match(source, /aria-current=\{activeTab === section.id \? "page"/);
  assert.match(source, /Go to section<select/);
});

test("admin readability is scoped to admin and retains pink selected states", async () => {
  const css = await read("app/admin-ux.css");
  assert.match(css, /\.admin-section-nav button.is-active \{ background: #ff2d95; color: #fff;/);
  assert.match(css, /\.admin-mobile-section select/);
  assert.match(css, /font-size: 14px !important/);
  assert.match(css, /\.admin-shell \.astryx-badge/);
});

test("reference-style admin shell has a fixed sidebar, refresh toolbar and live summary cards", async () => {
  const [source, css, page] = await Promise.all([read("app/admin/workspace.tsx"), read("app/admin-ux.css"), read("app/admin/page.tsx")]);
  assert.match(source, /admin-workspace-topbar/);
  assert.match(source, /workspaceRouter.refresh\(\)/);
  assert.match(source, /systemStatus.database \? "Database connected"/);
  assert.match(source, /admin-summary-cards/);
  assert.match(source, /<AdminNavIcon name=\{section.id\}/);
  assert.match(css, /--admin-canvas: #141519/);
  assert.match(css, /--admin-pink: #ff2d95/);
  assert.match(css, /\.admin-shell \.admin-sidebar \{ position: fixed;/);
  assert.doesNotMatch(page, /admin-dashboard-hero/);
});
