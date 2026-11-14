"use client";

import { RotateCcw, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, Instructions, Overlay, type GameProps } from "./game-shell";
import styles from "../play.module.css";

type Phase = "intro" | "playing" | "done";

const GAME_SECONDS = 30;

/**
 * The original REFI reflex challenge, kept as a game inside the hub rather than
 * the whole of /play. One tap per target, and the target moves on every hit.
 */
export function ReflexRush({ onFinish, onStart, onRestart, elapsed }: GameProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [seconds, setSeconds] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const targetRef = useRef<HTMLButtonElement | null>(null);
  const scoreRef = useRef(0);

  const moveTarget = useCallback(() => {
    setPosition({ x: 12 + Math.random() * 76, y: 15 + Math.random() * 70 });
  }, []);

  const start = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setSeconds(GAME_SECONDS);
    setPhase("playing");
    onStart();
    moveTarget();
  }, [moveTarget, onStart]);

  // One interval drives the countdown and ends the round from its callback, so
  // the round finishes exactly once and no effect sets state synchronously.
  useEffect(() => {
    if (phase !== "playing") return;
    const deadline = Date.now() + GAME_SECONDS * 1000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        setPhase("done");
        onFinish({ score: scoreRef.current, durationMs: GAME_SECONDS * 1000, completed: true });
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, onFinish]);

  // Keep keyboard focus on the target so the game is playable without a pointer.
  useEffect(() => {
    if (phase === "playing") targetRef.current?.focus();
  }, [phase, position]);

  const hit = useCallback(() => {
    if (phase !== "playing") return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    moveTarget();
  }, [phase, moveTarget]);

  if (phase === "intro") {
    return (
      <GameShell title="Reflex Rush" metrics={[]} onRestart={onRestart} showRestart={false}>
        <Overlay
          icon={<Trophy size={32} aria-hidden="true" />}
          heading="Reflex Rush"
          actions={
            <button type="button" className={styles.primary} onClick={start}>
              Start challenge
            </button>
          }
        >
          <Instructions
            steps={[
              `Tap the target as many times as you can in ${GAME_SECONDS} seconds.`,
              "The target moves after every hit.",
              "You can also press Enter or Space while the target has focus.",
              "Your score is the number of hits.",
            ]}
          />
        </Overlay>
      </GameShell>
    );
  }

  if (phase === "done") {
    return (
      <GameShell title="Reflex Rush" metrics={[{ label: "Score", value: score }, { label: "Seconds", value: GAME_SECONDS }]} onRestart={onRestart} showRestart={false}>
        <Overlay
          heading="Challenge complete."
          actions={
            <button type="button" className={styles.primary} onClick={onRestart}>
              <RotateCcw size={16} aria-hidden="true" /> Play again
            </button>
          }
        >
          <div className={styles.bigScore}>{score}</div>
          <p>Can a friend beat your score?</p>
        </Overlay>
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Reflex Rush"
      metrics={[{ label: "Score", value: score }, { label: "Time left", value: `${seconds}s` }]}
      onRestart={onRestart}
      showRestart
    >
      <div className={styles.arena}>
        <button
          ref={targetRef}
          aria-label="Hit target"
          className={styles.target}
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
          onClick={hit}
        />
      </div>
      <p className={styles.rule} style={{ color: "rgba(255,255,255,.7)", marginTop: 12 }}>
        Elapsed {elapsed}s. Tap the target, or press Enter or Space while it has focus.
      </p>
    </GameShell>
  );
}
