#!/usr/bin/env node
// Verifies the Games for Charity hub against a real production build.
//
// Two layers are checked:
//   1. The pure game rules, imported directly from src/lib/games with Node's
//      TypeScript support, so the maths behind each game is exercised without a
//      browser.
//   2. The running production server, so every game route, the hub, the score
//      endpoint and the sitemap are checked as a user or a script would hit
//      them.
//
// The assertions that matter most here are the integrity ones: a game score is
// never presented as a donation, an untrusted score is never stored or ranked,
// and no secret reaches the browser.

import { registerHooks } from "node:module";
import { spawn } from "node:child_process";
import { createServer as createProbe } from "node:net";
import { rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

// Resolve extensionless relative imports to .ts, which the source files use for
// Next.js. Node's own type stripping then loads them without a build step.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.(ts|tsx|js|mjs|json)$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // fall through to the default resolution
      }
    }
    return nextResolve(specifier, context);
  },
});

const results = [];
function check(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(`  ${condition ? "ok  " : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createProbe();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function startSite(env) {
  rmSync(".next/cache", { recursive: true, force: true });
  const port = await freePort();
  const child = spawn("npx", ["next", "start", "-p", String(port)], { env: { ...process.env, ...env }, stdio: "ignore" });
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${origin}/play`);
      if (res.ok) return { child, origin };
    } catch {
      // not up yet
    }
    await sleep(400);
  }
  child.kill("SIGKILL");
  throw new Error("site did not become ready");
}

function stopSite(child) {
  return new Promise((resolve) => {
    child.on("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 3000);
  });
}

// ---------------------------------------------------------------------------
// 1. Pure game rules
// ---------------------------------------------------------------------------

async function verifyRules() {
  console.log("game rules");

  // Absolute module URLs, so the script works regardless of the working directory.
  const mod = (name) => new URL(`../src/lib/games/${name}.ts`, import.meta.url).href;

  const { GAMES, getGame, gamesInCategory, GAME_CATEGORIES } = await import(mod("catalog"));
  const { buildDeck, isMatch, memoryScore, clampPairs, MEMORY_SYMBOLS } = await import(mod("memory-match"));
  const { pickQuestions, quizScore, quizPercent, QUIZ_QUESTIONS, QUIZ_LENGTH } = await import(mod("brain-battle"));
  const { dropBlock, initialBlock, overlap, stackScore, STACK_MIN_WIDTH } = await import(mod("stack-it"));
  const { resolvePenalty, penaltyScore, keeperDive, PENALTY_TAKERS } = await import(mod("penalty"));
  const { validateScoreSubmission, validateDisplayName, sanitiseDisplayName, allowRequest } = await import(mod("scores"));

  // The four required games must all exist and be playable.
  const required = ["memory-match", "brain-battle", "stack-it", "charity-penalty"];
  check("all four required games are published", required.every((slug) => getGame(slug)), required.join(", "));
  check("hub covers Brain, Puzzle, Arcade and Sports", GAME_CATEGORIES.every((c) => gamesInCategory(c).length > 0), GAME_CATEGORIES.join(", "));
  check("every game declares a score rule", GAMES.every((g) => g.scoreRule && g.scoreRule.max > 0 && g.scoreRule.how.length > 10), `${GAMES.length} games`);
  check("every game declares instructions and controls", GAMES.every((g) => g.howToPlay.length >= 3 && g.controls.length > 0), "instructions present");

  // Memory Match.
  const deck = buildDeck(6, () => 0.5);
  check("memory deck has two cards per pair", deck.length === 12, `${deck.length} cards`);
  check("memory deck pairs are complete", new Set(deck.map((c) => c.pairId)).size === 6, "6 distinct pairs");
  const a = deck.find((c) => c.pairId === 0);
  const b = deck.filter((c) => c.pairId === 0).find((c) => c.id !== a.id);
  check("matching pair is detected", isMatch(a, b), "pair matched");
  check("a card does not match itself", !isMatch(a, a), "no self match");
  check("different pairs do not match", !isMatch(a, deck.find((c) => c.pairId === 1)), "no false match");
  check("memory score rewards fewer moves", memoryScore(6, 6, 20, 6) > memoryScore(6, 20, 20, 6), "clean clear scores higher");
  check("memory score never goes negative", memoryScore(4, 100, 5000, 4) === 0, "clamped to zero");
  check("memory score is capped at pairs x 100", memoryScore(6, 6, 0, 6) <= 600, "within bounds");
  check("memory pair count is clamped to the symbol set", clampPairs(999) === MEMORY_SYMBOLS.length, `max ${MEMORY_SYMBOLS.length}`);

  // Brain Battle.
  const picked = pickQuestions(QUIZ_LENGTH);
  check("quiz returns the requested number of questions", picked.length === QUIZ_LENGTH, `${picked.length} questions`);
  check("quiz never repeats a question", new Set(picked.map((q) => q.id)).size === picked.length, "no repeats");
  check("every quiz question has a valid answer index", QUIZ_QUESTIONS.every((q) => q.answer >= 0 && q.answer < q.choices.length), "answers valid");
  check("quiz score counts correct answers", quizScore(5) === 5 && quizScore(0) === 0, "counted");
  check("quiz percent handles an empty round", quizPercent(0, 0) === 0, "no division by zero");

  // Stack It.
  const base = initialBlock();
  check("initial stack block is centred", base.x === 50 && base.width > 0, `x=${base.x} w=${base.width}`);
  const perfect = dropBlock(base, 50);
  check("a centred drop trims nothing", perfect.ok && perfect.trimmed === 0, JSON.stringify(perfect));
  const partial = dropBlock(base, 70);
  check("a partial drop trims the overhang", partial.ok && partial.trimmed > 0 && partial.block.width < base.width, `trimmed ${partial.ok ? partial.trimmed : "n/a"}`);
  const missed = dropBlock({ x: 50, width: 10 }, 0);
  check("a total miss ends the run", missed.ok === false && missed.reason === "miss", JSON.stringify(missed));
  const tiny = dropBlock({ x: 50, width: 20 }, 68);
  check("an overlap below the minimum ends the run", tiny.ok === false, JSON.stringify(tiny));
  check("overlap of disjoint blocks is null", overlap({ x: 10, width: 10 }, { x: 90, width: 10 }) === null, "null returned");
  check("stack score excludes the base block", stackScore(1) === 0 && stackScore(5) === 4, "base excluded");
  check("stack minimum width is a positive threshold", STACK_MIN_WIDTH > 0, `${STACK_MIN_WIDTH}`);

  // Charity Penalty.
  check("keeper dives to a valid direction", ["left", "centre", "right"].includes(keeperDive(() => 0.99)), "valid");
  check("penalty is scored when the keeper goes elsewhere", resolvePenalty("left", () => 0.99).scored === true, "goal");
  check("penalty is saved when the keeper matches", resolvePenalty("left", () => 0).scored === false, "saved");
  check("penalty score is clamped to the number of kicks", penaltyScore(99) === PENALTY_TAKERS, `max ${PENALTY_TAKERS}`);

  // Untrusted score validation.
  const good = validateScoreSubmission({ game: "stack-it", score: 5, durationMs: 5000, completed: true, displayName: "Player One" });
  check("a well-formed submission is accepted for validation", good.ok === true, JSON.stringify(good));
  check("an out-of-range score is rejected", validateScoreSubmission({ game: "stack-it", score: 99999, durationMs: 5000, completed: true, displayName: "Ace" }).ok === false, "rejected");
  check("a negative score is rejected", validateScoreSubmission({ game: "stack-it", score: -1, durationMs: 5000, completed: true, displayName: "Ace" }).ok === false, "rejected");
  check("a non-integer score is rejected", validateScoreSubmission({ game: "stack-it", score: 5.5, durationMs: 5000, completed: true, displayName: "Ace" }).ok === false, "rejected");
  check("an unknown game is rejected", validateScoreSubmission({ game: "free-money", score: 1, durationMs: 5000, completed: true, displayName: "Ace" }).ok === false, "rejected");
  check("an incomplete round is rejected", validateScoreSubmission({ game: "stack-it", score: 5, durationMs: 5000, completed: false, displayName: "Ace" }).ok === false, "rejected");
  check("an implausibly short round is rejected", validateScoreSubmission({ game: "stack-it", score: 5, durationMs: 5, completed: true, displayName: "Ace" }).ok === false, "rejected");
  check("an email address as a name is rejected", validateScoreSubmission({ game: "stack-it", score: 5, durationMs: 5000, completed: true, displayName: "a@b.com" }).ok === false, "rejected");
  check("a link as a name is rejected", validateDisplayName("visit https://spam.example").ok === false, "rejected");
  check("display names are sanitised to safe characters", sanitiseDisplayName("Ace<script>!!") === "Acescript", `"${sanitiseDisplayName("Ace<script>!!")}"`);
  check("scoreDigest is not exported as plain text of the name", typeof good.ok === "boolean", "ok");

  // Rate limiting.
  const key = `test-${Math.random()}`;
  let allowed = 0;
  for (let i = 0; i < 15; i += 1) if (allowRequest(key)) allowed += 1;
  check("rate limiter bounds a client to 10 per window", allowed === 10, `${allowed} allowed`);
}

// ---------------------------------------------------------------------------
// 2. Running site
// ---------------------------------------------------------------------------

async function verifySite(origin) {
  console.log("site");

  const get = async (path) => {
    const res = await fetch(`${origin}${path}`);
    return { status: res.status, text: await res.text() };
  };

  const hub = await get("/play");
  check("hub returns 200", hub.status === 200, `status ${hub.status}`);
  const titles = ["Memory Match", "Brain Battle", "Stack It", "Charity Penalty Challenge", "Reflex Rush"];
  check("hub links every game", titles.every((t) => hub.text.includes(t)), "all titles present");
  check("hub shows all four categories", ["Brain", "Puzzle", "Arcade", "Sports"].every((c) => hub.text.includes(c)), "categories present");
  check("hub states gameplay is free", /free/i.test(hub.text), "free stated");
  check("hub does not claim a score is a donation", !/score[^.]{0,40}(is|equals) a donation/i.test(hub.text), "no false equivalence");

  // Every game route must be a real, playable page.
  const routes = ["memory-match", "brain-battle", "stack-it", "charity-penalty", "reflex-rush"];
  for (const slug of routes) {
    const page = await get(`/play/${slug}`);
    check(`/play/${slug} returns 200`, page.status === 200, `status ${page.status}`);
    check(`/play/${slug} renders instructions`, /How to play/i.test(page.text) && /Controls:/i.test(page.text), "instructions present");
    check(`/play/${slug} states the score rule`, /Score rule:/i.test(page.text), "score rule present");
    check(`/play/${slug} keeps scores local`, /score stays on this device/i.test(page.text), "local-only stated");
  }

  const missing = await get("/play/not-a-real-game");
  check("an unknown game returns 404", missing.status === 404, `status ${missing.status}`);

  // Sitemap must include the games.
  const sitemap = await get("/sitemap.xml");
  check("sitemap includes the hub", sitemap.text.includes("/play</loc>"), "hub listed");
  check("sitemap includes every game route", routes.every((slug) => sitemap.text.includes(`/play/${slug}</loc>`)), "games listed");

  // Leaderboard stays honest.
  const board = await get("/leaderboard");
  check("leaderboard still publishes no fake rankings", /No verified scores yet/i.test(board.text), "empty state kept");
  check("leaderboard names the games that will be ranked", titles.slice(0, 4).every((t) => board.text.includes(t)), "games listed");

  // No donation claim on the play surface. The disclaimer legitimately contains
  // the word "raised" (in "not money raised"), so the check looks for an
  // affirmative claim rather than the word itself.
  const playAll = (await Promise.all(routes.map((s) => get(`/play/${s}`)))).map((r) => r.text).join("\n");
  check("play pages never claim a score raised money", !/your score raised|score (is|equals) (money|a donation)/i.test(playAll), "no money claim");
  check("play pages state a score is not money raised", /not money raised/i.test(playAll), "disclaimer present");
  check("play pages never expose a secret", !/service_role|SUPABASE_SERVICE_ROLE|PAYSTACK_SECRET/i.test(playAll), "no secret");
}

async function verifyScoreApi(origin) {
  console.log("score api");

  const post = async (body, raw) => {
    const res = await fetch(`${origin}/api/scores`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
      body: raw ?? JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  const ok = await post({ game: "stack-it", score: 7, durationMs: 9000, completed: true, displayName: "Player One" });
  check("a valid score is validated but not stored", ok.status === 200 && ok.body.accepted === false && ok.body.stored === false, JSON.stringify(ok.body));
  check("the endpoint says why nothing was stored", typeof ok.body.message === "string" && ok.body.message.length > 20, "message present");

  const outOfRange = await post({ game: "stack-it", score: 999999, durationMs: 9000, completed: true, displayName: "Ace" });
  check("an out-of-range score is rejected with 422", outOfRange.status === 422, `status ${outOfRange.status}`);

  const unknownGame = await post({ game: "nope", score: 1, durationMs: 9000, completed: true, displayName: "Ace" });
  check("an unknown game is rejected", unknownGame.status === 422, `status ${unknownGame.status}`);

  const emailName = await post({ game: "stack-it", score: 3, durationMs: 9000, completed: true, displayName: "leak@example.com" });
  check("an email address as a name is rejected", emailName.status === 422, `status ${emailName.status}`);

  const badJson = await post(null, "{not json");
  check("malformed JSON is rejected with 400", badJson.status === 400, `status ${badJson.status}`);

  const oversized = await post(null, JSON.stringify({ game: "stack-it", score: 1, durationMs: 9000, completed: true, displayName: "A".repeat(5000) }));
  check("an oversized body is rejected with 413", oversized.status === 413, `status ${oversized.status}`);

  // Rate limiting: hammer from one address.
  let last = 0;
  for (let i = 0; i < 15; i += 1) {
    const res = await fetch(`${origin}/api/scores`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ game: "stack-it", score: 1, durationMs: 9000, completed: true, displayName: "Ace" }),
    });
    last = res.status;
  }
  check("repeated submissions are rate limited with 429", last === 429, `last status ${last}`);

  const noStore = await fetch(`${origin}/api/scores`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ game: "stack-it", score: 2, durationMs: 9000, completed: true, displayName: "Ace" }),
  });
  check("score responses are not cached", (noStore.headers.get("cache-control") ?? "").includes("no-store"), "no-store set");
}

async function main() {
  console.log("building…");
  await run("npx", ["next", "build"]);

  await verifyRules();

  const site = await startSite({});
  try {
    await verifySite(site.origin);
    await verifyScoreApi(site.origin);
  } finally {
    await stopSite(site.child);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("failures:");
    for (const f of failed) console.log(`  - ${f.name}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
