import { test } from "node:test";
import assert from "node:assert/strict";
import { installTsHooks } from "./support/resolve-ts.mjs";

installTsHooks();

const { validateFundraiser, buildSlug, SLUG_PATTERN, TARGET_MIN_MINOR, TARGET_MAX_MINOR } =
  await import("../src/lib/fundraisers.ts");
const { attributionFromMetadata } = await import("../src/lib/donation-attribution.ts");

const fixedRandom = () => 0.123456789;

test("a complete campaign is accepted with sanitised values", () => {
  const result = validateFundraiser({
    title: "  Run   for   the   library  ",
    organiserName: "  Ada O.  ",
    story: " Ten kilometres. ",
    game: "stack-it",
    targetMinor: 250_000_00,
  }, fixedRandom);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.title, "Run for the library");
  assert.equal(result.value.organiserName, "Ada O.");
  assert.equal(result.value.story, "Ten kilometres.");
  assert.equal(result.value.game, "stack-it");
  assert.equal(result.value.targetMinor, 25_000_000);
  assert.match(result.value.slug, SLUG_PATTERN);
});

test("optional fields may be absent", () => {
  const result = validateFundraiser({ title: "Library fund", organiserName: "Ada" }, fixedRandom);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.story, null);
  assert.equal(result.value.game, null);
  assert.equal(result.value.targetMinor, null);
});

test("invalid campaigns are rejected with reasons", () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ title: "ab", organiserName: "Ada" }, /title/i],
    [{ title: "x".repeat(121), organiserName: "Ada" }, /title/i],
    [{ title: "Valid title", organiserName: "a@b.com" }, /email address or a link/i],
    [{ title: "Valid title", organiserName: "https://spam.example" }, /email address or a link/i],
    [{ title: "Valid title", organiserName: "" }, /organiser name/i],
    [{ title: "Valid title", organiserName: "Ada", game: "free-money" }, /published games/i],
    [{ title: "Valid title", organiserName: "Ada", targetMinor: TARGET_MIN_MINOR - 1 }, /goal/i],
    [{ title: "Valid title", organiserName: "Ada", targetMinor: TARGET_MAX_MINOR + 1 }, /goal/i],
    [{ title: "Valid title", organiserName: "Ada", targetMinor: 12.5 }, /goal/i],
    [{ title: "Valid title", organiserName: "Ada", story: "x".repeat(2_001) }, /story/i],
  ];

  for (const [payload, pattern] of cases) {
    const result = validateFundraiser(payload, fixedRandom);
    assert.equal(result.ok, false, JSON.stringify(payload));
    if (result.ok) continue;
    assert.match(result.errors.join(" "), pattern);
  }
});

test("a non-object body is rejected rather than coerced", () => {
  for (const payload of [null, "title", 42, []]) {
    const result = validateFundraiser(payload, fixedRandom);
    if (Array.isArray(payload)) {
      // An array is an object; it simply has no usable fields.
      assert.equal(result.ok, false);
    } else {
      assert.equal(result.ok, false);
    }
  }
});

test("two campaigns with the same title cannot receive the same address", () => {
  const first = buildSlug("Library fund", () => 0.1);
  const second = buildSlug("Library fund", () => 0.9);
  assert.notEqual(first, second);
  assert.match(first, SLUG_PATTERN);
  assert.match(second, SLUG_PATTERN);
});

test("a slug is safe for a URL even when the title is not", () => {
  const slug = buildSlug("Ada’s 10k run — for REFI!", () => 0.42);
  assert.match(slug, SLUG_PATTERN);
  assert.ok(slug.length <= 60);
  assert.ok(!slug.includes("--"));
});

test("an empty title still produces a usable slug", () => {
  assert.match(buildSlug("", () => 0.5), SLUG_PATTERN);
});

test("attribution is read back only from valid metadata", () => {
  assert.deepEqual(
    attributionFromMetadata({ fundraiser: "library-fund-a1b2", game: "stack-it", player: "Ada O." }),
    { fundraiserSlug: "library-fund-a1b2", game: "stack-it", playerName: "Ada O." },
  );
  assert.deepEqual(
    attributionFromMetadata({ fundraiser: "../etc/passwd", game: "free-money", player: "a@b.com" }),
    { fundraiserSlug: null, game: null, playerName: null },
  );
  assert.deepEqual(
    attributionFromMetadata(null),
    { fundraiserSlug: null, game: null, playerName: null },
  );
});
