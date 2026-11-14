import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("navigation images persist through branding and use the image picker", async () => {
  const [schema, branding, manager, header, media] = await Promise.all([
    read("db/schema.ts"), read("lib/site-branding.ts"), read("components/admin-branding-manager.tsx"), read("components/site-header.tsx"), read("lib/admin-media-library.ts"),
  ]);
  for (const key of ["menuEventsImagePath", "menuCommunityImagePath", "menuHostImagePath"]) {
    assert.ok(schema.includes(key));
    assert.ok(branding.includes(`${key}: menuImage("${key}")`));
    assert.ok(manager.includes(key));
    assert.ok(header.includes(key));
  }
  assert.match(manager, /Navigation dropdown images/);
  assert.match(manager, /Save dropdown images/);
  assert.match(header, /menuImages\[selectedMenu.id\] \|\| selectedMenu.image/);
  for (const column of ["menu_events_image_path", "menu_community_image_path", "menu_host_image_path"]) assert.ok(media.includes(column));
});
