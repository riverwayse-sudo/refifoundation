export type MemoryCard = { id: string; pairId: number; symbol: string };

/** Symbols used for the card faces. Kept to eight so a board stays readable. */
export const MEMORY_SYMBOLS = ["◆", "●", "▲", "■", "★", "⬟", "✦", "⬢"] as const;

export const MEMORY_MIN_PAIRS = 4;
export const MEMORY_MAX_PAIRS = MEMORY_SYMBOLS.length;

/**
 * Fisher-Yates shuffle. The random source is injectable so a seeded generator
 * can produce a deterministic deck in tests.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Build a shuffled deck of `pairCount` pairs, clamped to the available symbols. */
export function buildDeck(pairCount: number, random: () => number = Math.random): MemoryCard[] {
  const pairs = clampPairs(pairCount);
  const cards: MemoryCard[] = [];
  for (let i = 0; i < pairs; i += 1) {
    cards.push({ id: `card-${i}-a`, pairId: i, symbol: MEMORY_SYMBOLS[i] });
    cards.push({ id: `card-${i}-b`, pairId: i, symbol: MEMORY_SYMBOLS[i] });
  }
  return shuffle(cards, random);
}

export function clampPairs(pairCount: number): number {
  if (!Number.isFinite(pairCount)) return MEMORY_MIN_PAIRS;
  return Math.max(MEMORY_MIN_PAIRS, Math.min(Math.floor(pairCount), MEMORY_MAX_PAIRS));
}

/** Two distinct cards form a pair when they share a pairId. */
export function isMatch(a: MemoryCard, b: MemoryCard): boolean {
  return a.id !== b.id && a.pairId === b.pairId;
}

/**
 * Score for a completed board.
 *
 * Rewards pairs found and penalises wasted moves and elapsed time, so a fast
 * clean clear beats a slow one. Clamped to the rule bounds declared in the
 * catalog (0..pairs*100).
 */
export function memoryScore(matches: number, moves: number, seconds: number, pairs: number): number {
  const maxScore = clampPairs(pairs) * 100;
  const wasted = Math.max(0, moves - matches);
  const raw = matches * 100 - wasted * 4 - Math.max(0, Math.floor(seconds)) * 2;
  return Math.max(0, Math.min(maxScore, Math.round(raw)));
}
