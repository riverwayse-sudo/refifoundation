/**
 * Stack It rules.
 *
 * A block is a horizontal span described by its centre and width, both as a
 * percentage of the play area, so the same rules work at any screen size.
 * Dropping trims the block to the overlap with the block below, which is what
 * makes each successive block narrower and the run finite.
 */

export type Block = { x: number; width: number };

/** Narrowest block that can still be stacked. Below this the run ends. */
export const STACK_MIN_WIDTH = 6;

/** Where a block starts, in percent of the play area. */
export const STACK_START_WIDTH = 60;

/** Score rule bound, matching the catalog. */
export const STACK_MAX_BLOCKS = 200;

/** The starting block, centred at the bottom of the tower. */
export function initialBlock(): Block {
  return { x: 50, width: STACK_START_WIDTH };
}

/**
 * Horizontal overlap between two blocks, or null when they do not overlap at
 * all (a miss). Returned as a centred span.
 */
export function overlap(a: Block, b: Block): Block | null {
  const left = Math.max(a.x - a.width / 2, b.x - b.width / 2);
  const right = Math.min(a.x + a.width / 2, b.x + b.width / 2);
  const width = right - left;
  if (width <= 0) return null;
  return { x: (left + right) / 2, width };
}

export type DropResult =
  | { ok: true; block: Block; trimmed: number }
  | { ok: false; reason: "miss" | "too-narrow" };

/**
 * Drop a block whose centre is `movingX` onto `base`.
 *
 * The dropped block keeps the base's width before trimming, so the difficulty
 * comes from aim rather than from a shrinking mover. Returns the trimmed block
 * and how much was cut away, or the reason the run ended.
 */
export function dropBlock(base: Block, movingX: number): DropResult {
  const mover: Block = { x: clampX(movingX), width: base.width };
  const span = overlap(mover, base);
  if (!span) return { ok: false, reason: "miss" };
  if (span.width < STACK_MIN_WIDTH) return { ok: false, reason: "too-narrow" };
  return { ok: true, block: span, trimmed: base.width - span.width };
}

function clampX(x: number): number {
  if (!Number.isFinite(x)) return 50;
  return Math.max(0, Math.min(100, x));
}

/** Blocks successfully placed, excluding the base. */
export function stackScore(blockCount: number): number {
  return Math.max(0, Math.min(STACK_MAX_BLOCKS, Math.floor(blockCount) - 1));
}

/**
 * Traversal speed in percent per second for a tower of a given height. The
 * mover accelerates as the tower grows, but is capped so the game stays
 * playable on a small screen.
 */
export function stackSpeed(blockCount: number): number {
  const base = 55;
  const perBlock = 3.5;
  return Math.min(180, base + Math.max(0, blockCount - 1) * perBlock);
}
