"use client";

import { Brain, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pickQuestions, quizPercent, quizScore, QUIZ_LENGTH, type QuizQuestion } from "@/lib/games/brain-battle";
import { GameShell, Instructions, Overlay, type GameProps } from "./game-shell";
import styles from "../play.module.css";

type Phase = "intro" | "playing" | "done";

/** Seconds allowed per question, shown as a countdown during play. */
const SECONDS_PER_QUESTION = 15;

export function BrainBattle({ onFinish, onStart, onRestart }: GameProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => pickQuestions(QUIZ_LENGTH));
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [seconds, setSeconds] = useState(SECONDS_PER_QUESTION);
  const startedAt = useRef<number>(0);
  const [finishedMs, setFinishedMs] = useState(0);

  const question = questions[index];
  const score = useMemo(() => quizScore(correct), [correct]);

  const finish = useCallback(
    (finalCorrect: number) => {
      const durationMs = Math.max(1000, Date.now() - startedAt.current);
      setFinishedMs(durationMs);
      setPhase("done");
      onFinish({ score: quizScore(finalCorrect), durationMs, completed: true });
    },
    [onFinish],
  );

  const advance = useCallback(
    (nextCorrect: number) => {
      if (index + 1 >= questions.length) {
        finish(nextCorrect);
        return;
      }
      setIndex((i) => i + 1);
      setChosen(null);
      setSeconds(SECONDS_PER_QUESTION);
    },
    [index, questions.length, finish],
  );

  // Per-question countdown. Expiring counts as an unanswered question.
  useEffect(() => {
    if (phase !== "playing" || chosen !== null) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          advance(correct);
          return SECONDS_PER_QUESTION;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, chosen, index, correct, advance]);

  const start = useCallback(() => {
    setQuestions(pickQuestions(QUIZ_LENGTH));
    setIndex(0);
    setChosen(null);
    setCorrect(0);
    setSeconds(SECONDS_PER_QUESTION);
    startedAt.current = Date.now();
    setPhase("playing");
    onStart();
  }, [onStart]);

  const answer = useCallback(
    (choice: number) => {
      if (chosen !== null) return;
      setChosen(choice);
      const isRight = choice === question.answer;
      const nextCorrect = isRight ? correct + 1 : correct;
      if (isRight) setCorrect(nextCorrect);
      window.setTimeout(() => advance(nextCorrect), 900);
    },
    [chosen, question, correct, advance],
  );

  if (phase === "intro") {
    return (
      <GameShell title="Brain Battle" metrics={[]} onRestart={onRestart} showRestart={false}>
        <Overlay
          icon={<Brain size={32} aria-hidden="true" />}
          heading="Brain Battle"
          actions={
            <button type="button" className={styles.primary} onClick={start}>
              Start quiz
            </button>
          }
        >
          <Instructions steps={[`Answer ${QUIZ_LENGTH} questions, one at a time.`, `You have ${SECONDS_PER_QUESTION} seconds for each question.`, "A correct answer scores a point.", "Your result shows correct answers and completion time."]} />
        </Overlay>
      </GameShell>
    );
  }

  if (phase === "done") {
    const percent = quizPercent(correct, questions.length);
    return (
      <GameShell title="Brain Battle" metrics={[{ label: "Correct", value: `${correct}/${questions.length}` }, { label: "Percent", value: `${percent}%` }, { label: "Time", value: `${Math.round(finishedMs / 1000)}s` }]} onRestart={onRestart} showRestart={false}>
        <Overlay
          heading={correct === questions.length ? "Perfect score." : "Quiz complete."}
          actions={
            <button type="button" className={styles.primary} onClick={onRestart}>
              <RotateCcw size={16} aria-hidden="true" /> Play again
            </button>
          }
        >
          <div className={styles.bigScore}>{score}</div>
          <p>
            You answered {correct} of {questions.length} correctly in {Math.round(finishedMs / 1000)} seconds.
          </p>
        </Overlay>
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Brain Battle"
      metrics={[{ label: "Question", value: `${index + 1}/${questions.length}` }, { label: "Correct", value: correct }, { label: "Time left", value: `${seconds}s` }]}
      onRestart={onRestart}
      showRestart
    >
      <p className={styles.question}>{question.prompt}</p>
      <div className={styles.choices}>
        {question.choices.map((choice, i) => {
          const answered = chosen !== null;
          const isAnswer = i === question.answer;
          const isChosen = i === chosen;
          const state = !answered ? "" : isAnswer ? styles.choiceCorrect : isChosen ? styles.choiceWrong : "";
          return (
            <button
              key={choice}
              type="button"
              className={[styles.choice, state].join(" ")}
              onClick={() => answer(i)}
              disabled={answered}
              aria-label={answered && isAnswer ? `${choice} (correct answer)` : choice}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <p className={styles.feedback} role="status">
          {chosen === question.answer ? "Correct. " : "Not quite. "}
          {question.explanation}
        </p>
      )}
    </GameShell>
  );
}
