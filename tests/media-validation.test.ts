import { test } from "node:test";
import assert from "node:assert/strict";
import { hasImageSignature } from "../src/lib/cms/media-validation.ts";

test("accepts matching PNG, JPEG, WebP, AVIF and GIF signatures", () => {
  assert.equal(hasImageSignature("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(hasImageSignature("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff])), true);
  assert.equal(hasImageSignature("image/webp", Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), true);
  assert.equal(hasImageSignature("image/avif", Uint8Array.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])), true);
  assert.equal(hasImageSignature("image/gif", new TextEncoder().encode("GIF89a")), true);
});

test("rejects spoofed MIME types and truncated signatures", () => {
  const html = new TextEncoder().encode("<html>not an image</html>");
  assert.equal(hasImageSignature("image/png", html), false);
  assert.equal(hasImageSignature("image/jpeg", Uint8Array.from([0xff, 0xd8])), false);
  assert.equal(hasImageSignature("image/svg+xml", html), false);
});
