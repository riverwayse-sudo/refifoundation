"use client";

import { Grid3X3, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { buildDeck, clampPairs, isMatch, memoryScore, MEMORY_MIN_PAIRS, type MemoryCard } from "@/lib/games/memory-match";
import { GameShell, Instructions, Overlay, type GameProps } from "./game-shell";
import styles from "../play.module.css";

type Phase = "intro" | "playing" | "done";

const DIFFICULTIES = [
  { pairs: 4, label: "Easy · 4 pairs" },
  { pairs: 6, label: "Medium · 6 pairs" },
  { pairs: 8, label: "Hard · 8 pairs" },
];

export function MemoryMatch({ onFinish, onStart, onRestart, elapsed }: GameProps) {
  const [pairs, setPairs] = useState(MEMORY_MIN_PAIRS);
  const [deck, setDeck] = useState<MemoryCard[]>(() => buildDeck(MEMORY_MIN_PAIRS));
  const [faceUp, setFaceUp] = useState<string[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");

  const totalPairs = useMemo(() => clampPairs(pairs), [pairs]);
  const score = useMemo(() => memoryScore(matched.length, moves, elapsed, totalPairs), [matched.length, moves, elapsed, totalPairs]);

  const reset = useCallback(
    (nextPairs: number) => {
      setPairs(nextPairs);
      setDeck(buildDeck(nextPairs));
      setFaceUp([]);
      setMatched([]);
      setMoves(0);
      setPhase("playing");
      onStart();
    },
    [onStart],
  );

  const reveal = useCallback(
    (card: MemoryCard) => {
      if (phase !== "playing") return;
      if (faceUp.includes(card.id) || matched.includes(card.pairId)) return;
      if (faceUp.length === 1) {
        const first = deck.find((c) => c.id === faceUp[0]);
        setMoves((m) => m + 1);
        if (first && isMatch(first, card)) {
          const nextMatched = [...matched, card.pairId];
          setMatched(nextMatched);
          setFaceUp([]);
          if (nextMatched.length === totalPairs) {
            setPhase("done");
            onFinish({ score: memoryScore(nextMatched.length, moves + 1, elapsed, totalPairs), durationMs: elapsed * 1000, completed: true });
          }
          return;
        }
        // Wrong pair: show both, then turn them back.
        setFaceUp([faceUp[0], card.id]);
        window.setTimeout(() => setFaceUp([]), 750);
        return;
      }
      setFaceUp([card.id]);
    },
    [phase, faceUp, matched, deck, totalPairs, onFinish, elapsed, moves],
  );

  if (phase === "intro") {
    return (
      <GameShell title="Memory Match" metrics={[]} onRestart={onRestart} showRestart={false}>
        <Overlay
          icon={<Grid3X3 size={32} aria-hidden="true" />}
          heading="Memory Match"
          actions={
            <>
              {DIFFICULTIES.map((option) => (
                <button key={option.pairs} type="button" className={styles.primary} onClick={() => reset(option.pairs)}>
                  {option.label}
                </button>
              ))}
            </>
          }
        >
          <Instructions steps={["Pick a difficulty below.", "Turn over two cards to find a matching pair.", "Matched pairs stay face up; a wrong pair turns back.", "Clear the board to finish."]} />
        </Overlay>
      </GameShell>
    );
  }

  if (phase === "done") {
    return (
      <GameShell title="Memory Match" metrics={[{ label: "Score", value: score }, { label: "Moves", value: moves }, { label: "Time", value: `${elapsed}s` }]} onRestart={onRestart} showRestart={false}>
        <Overlay
          heading="Board cleared."
          actions={
            <>
              <button type="button" className={styles.primary} onClick={onRestart}>
                <RotateCcw size={16} aria-hidden="true" /> Play again
              </button>
            </>
          }
        >
          <div className={styles.bigScore}>{score}</div>
          <p>
            {matched.length} pairs in {moves} moves and {elapsed} seconds.
          </p>
        </Overlay>
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Memory Match"
      metrics={[{ label: "Score", value: score }, { label: "Pairs", value: `${matched.length}/${totalPairs}` }, { label: "Moves", value: moves }, { label: "Time", value: `${elapsed}s` }]}
      onRestart={onRestart}
      showRestart
    >
      <div className={styles.board} role="group" aria-label="Memory cards">
        {deck.map((card) => {
          const isUp = faceUp.includes(card.id);
          const isDone = matched.includes(card.pairId);
          return (
            <button
              key={card.id}
              type="button"
              className={[styles.tile, isUp || isDone ? styles.tileFaceUp : "", isDone ? styles.tileMatched : ""].join(" ")}
              onClick={() => reveal(card)}
              disabled={isDone}
              aria-label={isDone || isUp ? `Card showing ${card.symbol}` : "Hidden card"}
            >
              <span className={styles.tileInner} aria-hidden="true">
                {isUp || isDone ? card.symbol : "?"}
              </span>
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
