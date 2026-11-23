import type { GameDefinition, GameSlug } from "./types";

/**
 * The single source of truth for the hub.
 *
 * The hub cards, the per-game routes, the sitemap and the score validator all
 * read from this list, so a game cannot be advertised on the hub without a
 * definition and a score rule.
 */
export const GAMES: GameDefinition[] = [
  {
    slug: "memory-match",
    title: "Memory Match",
    category: "Puzzle",
    blurb: "Flip cards and pair them up. Fewer moves and less time score higher.",
    howToPlay: [
      "Choose a difficulty to set the number of pairs.",
      "Turn over two cards at a time to find a matching pair.",
      "Matched pairs stay face up; a wrong pair turns back.",
      "Clear the board to finish. Moves and time are recorded.",
    ],
    controls: "Click, tap, or focus a card and press Enter or Space.",
    scoreRule: {
      min: 0,
      max: 800,
      unit: "points",
      direction: "higher",
      how: "100 points per matched pair, less 4 per wasted move and 2 per second elapsed, never below zero.",
    },
  },
  {
    slug: "brain-battle",
    title: "Brain Battle",
    category: "Brain",
    blurb: "A short quiz on the Foundation's work and general knowledge.",
    howToPlay: [
      "Answer each multiple-choice question before the timer runs out.",
      "A correct answer scores a point; a wrong answer scores nothing.",
      "The quiz ends after the final question or when time expires.",
      "Your result shows correct answers and completion time.",
    ],
    controls: "Click, tap, or use the arrow keys and Enter.",
    scoreRule: {
      min: 0,
      max: 8,
      unit: "correct",
      direction: "higher",
      how: "One point per correctly answered question.",
    },
  },
  {
    slug: "stack-it",
    title: "Stack It",
    category: "Arcade",
    blurb: "Drop each block on the one below. Miss the overlap and the run ends.",
    howToPlay: [
      "A block slides across the top of the tower.",
      "Drop it so it lands on the block below.",
      "The overhang is trimmed away, so each block gets narrower.",
      "Miss the tower completely and the run ends.",
    ],
    controls: "Press Space, Enter, or click to drop.",
    scoreRule: {
      min: 0,
      max: 200,
      unit: "blocks",
      direction: "higher",
      how: "One point per successfully stacked block.",
    },
  },
  {
    slug: "charity-penalty",
    title: "Charity Penalty Challenge",
    category: "Sports",
    blurb: "Five penalties. Pick your corner and beat the keeper.",
    howToPlay: [
      "You take five penalties against the keeper.",
      "Choose left, centre, or right before each kick.",
      "The keeper dives one way. If you pick differently, you score.",
      "Your final score is the number of goals from five.",
    ],
    controls: "Click or tap a direction, or press the left, down, and right arrow keys.",
    scoreRule: {
      min: 0,
      max: 5,
      unit: "goals",
      direction: "higher",
      how: "One point per goal scored out of five penalties.",
    },
  },
  {
    slug: "reflex-rush",
    title: "Reflex Rush",
    category: "Arcade",
    blurb: "The original REFI 30-second challenge. Tap the target as often as you can.",
    howToPlay: [
      "Start the round and tap the moving target.",
      "The target moves after every hit, so accuracy matters more than speed.",
      "The round lasts 30 seconds.",
      "Your score is the number of hits.",
    ],
    controls: "Click, tap, or press Enter or Space while the target has focus.",
    scoreRule: {
      min: 0,
      max: 300,
      unit: "hits",
      direction: "higher",
      how: "One point per successful hit within the 30-second round.",
    },
  },
];

export const GAME_SLUGS: GameSlug[] = GAMES.map((game) => game.slug);

export const GAME_CATEGORIES: GameDefinition["category"][] = ["Brain", "Puzzle", "Arcade", "Sports"];

export function getGame(slug: string): GameDefinition | undefined {
  return GAMES.find((game) => game.slug === slug);
}

export function gamesInCategory(category: GameDefinition["category"]): GameDefinition[] {
  return GAMES.filter((game) => game.category === category);
}
