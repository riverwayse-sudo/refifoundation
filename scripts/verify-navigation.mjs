import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { primaryNavigationLinks } from "../src/app/_components/navigation-links.ts";

test("primary navigation includes every accepted destination", () => {
  const hrefs = primaryNavigationLinks.map(({ href }) => href);
  assert.deepEqual(hrefs, [
    "/about", "/our-work", "/impact", "/events", "/matches",
    "/play", "/stories", "/contact", "/get-involved", "/donate",
  ]);
  assert.equal(new Set(hrefs).size, hrefs.length, "navigation destinations must be unique");
  assert.equal(primaryNavigationLinks.filter(({ emphasis }) => emphasis).length, 1);
  assert.equal(primaryNavigationLinks.find(({ emphasis }) => emphasis)?.href, "/donate");
});

test("desktop and mobile navigation render the same shared list", async () => {
  const [desktop, mobile] = await Promise.all([
    readFile(new URL("../src/app/_components/site-chrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/_components/mobile-navigation.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of [desktop, mobile]) {
    assert.match(source, /import \{ primaryNavigationLinks \} from "\.\/navigation-links"/);
    assert.match(source, /primaryNavigationLinks\.map/);
  }
  assert.doesNotMatch(mobile, /const links\s*=/);
});
