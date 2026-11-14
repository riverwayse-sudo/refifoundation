// Guards against the handover documentation drifting away from the code.
//
// The owner follows docs/owner-handover.md to connect the content manager. If a
// documented environment variable name does not match the one the code reads, the
// setup silently fails in a way that is hard to diagnose. This test fails the build
// instead.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(ts|tsx|mjs)$/.test(entry)) found.push(full);
  }
  return found;
}

/** Environment variables the application actually reads. */
function envVarsUsed(): Set<string> {
  const used = new Set<string>();
  for (const file of [...sourceFiles(path.join(root, "src")), ...sourceFiles(path.join(root, "scripts"))]) {
    const contents = readFileSync(file, "utf8");
    for (const match of contents.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      used.add(match[1]);
    }
  }
  return used;
}

/** Environment variables named in the handover document. */
function envVarsDocumented(): Set<string> {
  const doc = readFileSync(path.join(root, "docs", "owner-handover.md"), "utf8");
  // Only consider the inline-code style used for the setup table, and ignore
  // prefixes such as NEXT_PUBLIC_ which appear as fragments in prose.
  const named = new Set<string>();
  for (const match of doc.matchAll(/`([A-Z][A-Z0-9_]{2,})`/g)) {
    named.add(match[1]);
  }
  return named;
}

test("every environment variable the setup doc names is one the code reads", () => {
  const used = envVarsUsed();
  const documented = envVarsDocumented();
  // These appear in the doc only to warn against them or to describe the old
  // GitHub-based setup that has been removed.
  const allowedExtras = new Set(["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_"]);

  const unknown = [...documented].filter((name) => !used.has(name) && !allowedExtras.has(name));
  assert.deepEqual(
    unknown,
    [],
    `docs/owner-handover.md names environment variables the code does not read: ${unknown.join(", ")}`,
  );
});

test("every required environment variable is documented", () => {
  const used = envVarsUsed();
  const documented = envVarsDocumented();
  // Variables that are optional or provided by the platform rather than the owner.
  const optional = new Set(["NODE_ENV"]);

  const undocumented = [...used].filter((name) => !documented.has(name) && !optional.has(name));
  assert.deepEqual(
    undocumented,
    [],
    `the code reads environment variables that docs/owner-handover.md does not document: ${undocumented.join(", ")}`,
  );
});
