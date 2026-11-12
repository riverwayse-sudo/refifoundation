/**
 * Brain Battle question bank and scoring.
 *
 * Questions live in this array so content can be edited without touching the
 * component. The correct answer is stored as an index, and the component
 * receives the questions it should render; the answer key is not needed to
 * display a question, only to mark it.
 */

export type QuizQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
  /** Shown after the player answers. */
  explanation: string;
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "What does the tagline 'RAISING • EMPOWERING • TRANSFORMING LIVES' describe?",
    choices: ["A slogan only used on merchandise", "The Foundation's stated purpose", "A fundraising target", "A sports league name"],
    answer: 1,
    explanation: "It states the Foundation's purpose: raising, empowering and transforming lives.",
  },
  {
    id: "q2",
    prompt: "How many players take part in a standard football (soccer) team on the pitch?",
    choices: ["9", "10", "11", "12"],
    answer: 2,
    explanation: "A football team fields eleven players, including the goalkeeper.",
  },
  {
    id: "q3",
    prompt: "In the Charity Penalty Challenge, what decides whether a penalty is scored?",
    choices: ["The speed of the tap", "Whether your direction differs from the keeper's dive", "The number of taps", "A random coin toss"],
    answer: 1,
    explanation: "You score when the corner you choose is not the one the keeper dives to.",
  },
  {
    id: "q4",
    prompt: "Which of these is a responsible way to describe a game score?",
    choices: ["As money raised for the Foundation", "As a donation you have made", "As a personal game result", "As a guaranteed prize"],
    answer: 2,
    explanation: "A score is a game result. It is not a donation, a reward or a prize.",
  },
  {
    id: "q5",
    prompt: "What is a 'leaderboard' in this hub?",
    choices: ["A list of donors and amounts", "A ranking derived from trustworthy, clearly defined score data", "A payment history", "A list of sponsors"],
    answer: 1,
    explanation: "A leaderboard ranks scores from trustworthy, clearly defined data. Donations are reported separately.",
  },
  {
    id: "q6",
    prompt: "Why does the hub keep gameplay free?",
    choices: ["Because games are advertising", "Because participation should never depend on payment", "Because donations are impossible", "Because the games are unfinished"],
    answer: 1,
    explanation: "Playing is free. Giving is optional and is never a condition for playing.",
  },
  {
    id: "q7",
    prompt: "How long does a standard football match last, excluding stoppage time?",
    choices: ["60 minutes", "80 minutes", "90 minutes", "100 minutes"],
    answer: 2,
    explanation: "A standard match is two halves of 45 minutes, so 90 minutes in total.",
  },
  {
    id: "q8",
    prompt: "What should happen to a score reported only by the browser?",
    choices: ["It should be trusted immediately", "It should be treated as untrusted until validated", "It should be published as a ranking", "It should be added to fundraising totals"],
    answer: 1,
    explanation: "A browser-reported score can be edited, so it must be validated before it is trusted.",
  },
];

/** Total questions in a round. Kept below the bank size so repeats are avoidable. */
export const QUIZ_LENGTH = 6;

/** Seconds allowed for the whole quiz. */
export const QUIZ_SECONDS = 90;

/**
 * Pick `count` questions without repeats.
 *
 * The random source is injectable so tests can pin the selection.
 */
export function pickQuestions(count: number, random: () => number = Math.random): QuizQuestion[] {
  const target = Math.max(1, Math.min(Math.floor(count), QUIZ_QUESTIONS.length));
  const pool = [...QUIZ_QUESTIONS];
  const chosen: QuizQuestion[] = [];
  while (chosen.length < target && pool.length > 0) {
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}

/** One point per correct answer, clamped to the bank size. */
export function quizScore(correct: number): number {
  return Math.max(0, Math.min(QUIZ_QUESTIONS.length, Math.floor(correct)));
}

/** Percentage of a round answered correctly, rounded. Zero-length rounds score zero. */
export function quizPercent(correct: number, asked: number): number {
  if (asked <= 0) return 0;
  return Math.round((Math.max(0, correct) / asked) * 100);
}
