import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const roots = ["app", "components", "lib", "scripts"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const usage = {};

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "generated-media-usage.json") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (extensions.has(path.extname(entry.name))) {
      const relative = path.relative(process.cwd(), absolute);
      const source = await readFile(absolute, "utf8");
      for (const match of source.matchAll(/\/(?:images|videos|logos)\/[A-Za-z0-9_./-]+\.(?:jpe?g|png|webp|gif|avif|svg|mp4)/gi)) {
        usage[match[0]] ??= [];
        if (!usage[match[0]].includes(relative)) usage[match[0]].push(relative);
      }
    }
  }
}

for (const root of roots) await walk(path.join(process.cwd(), root));
await writeFile(
  path.join(process.cwd(), "lib/generated-media-usage.json"),
  `${JSON.stringify(usage, null, 2)}\n`,
);
