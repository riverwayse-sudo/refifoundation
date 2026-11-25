import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "src", "app");
const cssRoot = path.join(root, "src");
const dropdownStylesPath = path.join(cssRoot, "styles", "dropdowns.css");
const layoutPath = path.join(appRoot, "layout.tsx");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

const appFiles = (await walk(appRoot)).filter((file) => /\.(tsx|ts)$/.test(file));
const dropdownUsages = [];
for (const file of appFiles) {
  const source = await readFile(file, "utf8");
  const matches = source.match(/<select\b/g) ?? [];
  for (let index = 0; index < matches.length; index += 1) {
    dropdownUsages.push(path.relative(root, file));
  }
}

assert.ok(dropdownUsages.length > 0, "Expected at least one native dropdown in the application.");
const styles = await readFile(dropdownStylesPath, "utf8");
assert.match(styles, /select:not\(\[multiple\]\):not\(\[size\]\)/, "The shared stylesheet must style single-value native selects.");
assert.match(styles, /:focus-visible/, "Dropdowns must have a visible keyboard focus state.");
assert.match(styles, /:disabled/, "Dropdowns must have a disabled state.");
assert.match(styles, /forced-colors/, "Dropdowns must preserve forced-colour accessibility.");
const layout = await readFile(layoutPath, "utf8");
assert.match(layout, /\.\.\/styles\/dropdowns\.css/, "The shared dropdown system must load from the root layout.");

const cssFiles = (await walk(cssRoot)).filter((file) => file.endsWith(".css") && file !== dropdownStylesPath);
for (const file of cssFiles) {
  const source = await readFile(file, "utf8");
  const selectorBlocks = source.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  for (const block of selectorBlocks) {
    const selector = block.slice(0, block.indexOf("{"));
    assert.doesNotMatch(selector, /(^|[\s,>+~])select(?=[\s.#:[,>+~]|$)/i,
      `Dropdown styling must stay centralised; found a local select selector in ${path.relative(root, file)}.`);
  }
}

console.log(`Verified shared dropdown system for ${dropdownUsages.length} native select controls across ${new Set(dropdownUsages).size} application files.`);
