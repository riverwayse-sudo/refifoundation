/**
 * Charity Penalty Challenge rules.
 *
 * Five penalties, each resolved by comparing the direction the player picks
 * with the direction the keeper dives. The keeper's choice comes from an
 * injectable random source so outcomes can be pinned in tests.
 */

export type PenaltyDirection = "left" | "centre" | "right";

export const PENALTY_DIRECTIONS: PenaltyDirection[] = ["left", "centre", "right"];

/** Number of penalties in a round, matching the catalog score rule. */
export const PENALTY_TAKERS = 5;

export type PenaltyOutcome = {
  /** What the player chose. */
  shot: PenaltyDirection;
  /** Where the keeper went. */
  keeper: PenaltyDirection;
  scored: boolean;
};

/** The keeper picks one of the three directions. */
export function keeperDive(random: () => number = Math.random): PenaltyDirection {
  const index = Math.min(PENALTY_DIRECTIONS.length - 1, Math.floor(random() * PENALTY_DIRECTIONS.length));
  return PENALTY_DIRECTIONS[Math.max(0, index)];
}

/** A penalty is scored when the keeper does not go the same way as the shot. */
export function resolvePenalty(shot: PenaltyDirection, random: () => number = Math.random): PenaltyOutcome {
  const keeper = keeperDive(random);
  return { shot, keeper, scored: keeper !== shot };
}

/** Goals scored out of the five taken, clamped to the rule bounds. */
export function penaltyScore(goals: number): number {
  return Math.max(0, Math.min(PENALTY_TAKERS, Math.floor(goals)));
}

/** Plain-language label for a result row, used by the summary. */
export function outcomeLabel(outcome: PenaltyOutcome): string {
  return outcome.scored ? "Goal" : "Saved";
}
