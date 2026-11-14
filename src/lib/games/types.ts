/**
 * Shared types for the Games for Charity hub.
 *
 * Game rules live in this folder as pure functions so they can be unit tested
 * and reused without a browser. Components own presentation only.
 */

export type GameCategory = "Brain" | "Puzzle" | "Arcade" | "Sports";

export type GameSlug = "memory-match" | "brain-battle" | "stack-it" | "charity-penalty" | "reflex-rush";

/** Which way a score sorts. Every published game currently rewards more. */
export type ScoreDirection = "higher" | "lower";

export type ScoreRule = {
  /** Inclusive lower bound for a believable result. */
  min: number;
  /** Inclusive upper bound. A value above this is rejected as implausible. */
  max: number;
  /** Human-readable unit shown next to the score. */
  unit: string;
  direction: ScoreDirection;
  /** Plain-language statement of how the score is produced. */
  how: string;
};

export type GameDefinition = {
  slug: GameSlug;
  title: string;
  category: GameCategory;
  /** One line for the hub card. */
  blurb: string;
  /** Numbered instructions shown before play. */
  howToPlay: string[];
  /** Optional control note, e.g. keyboard support. */
  controls: string;
  scoreRule: ScoreRule;
};
