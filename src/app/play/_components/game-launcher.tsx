"use client";

import Link from "next/link";
import { HeartHandshake, Share2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { GameDefinition } from "@/lib/games/types";
import { BrainBattle } from "./brain-battle";
import { CharityPenalty } from "./charity-penalty";
import { MemoryMatch } from "./memory-match";
import { ReflexRush } from "./reflex-rush";
import { StackIt } from "./stack-it";
import { useElapsed } from "./use-elapsed";
import type { GameResult } from "./game-shell";
import styles from "../play.module.css";

/**
 * Hosts one round of a game. It is mounted with a `key` per round, so a restart
 * remounts it and the stopwatch starts from zero with the game back on its intro
 * screen. The stopwatch runs only between `onStart` and `onFinish`, so time spent
 * reading the instructions is never counted against the player.
 */
function RoundHost({
  game,
  onFinish,
  onRestart,
}: {
  game: GameDefinition;
  onFinish: (result: GameResult) => void;
  onRestart: () => void;
}) {
  const [running, setRunning] = useState(false);
  const elapsed = useElapsed(running);

  const onStart = useCallback(() => setRunning(true), []);
  const finish = useCallback(
    (next: GameResult) => {
      setRunning(false);
      onFinish(next);
    },
    [onFinish],
  );

  const common = { onFinish: finish, onStart, onRestart, elapsed };

  return (
    <div>
      {game.slug === "memory-match" && <MemoryMatch {...common} />}
      {game.slug === "brain-battle" && <BrainBattle {...common} />}
      {game.slug === "stack-it" && <StackIt {...common} />}
      {game.slug === "charity-penalty" && <CharityPenalty {...common} />}
      {game.slug === "reflex-rush" && <ReflexRush {...common} />}
    </div>
  );
}

/**
 * Hosts a single game: owns the round, the most recent result, and the optional
 * share action. Each game component owns only its own rules and calls `onFinish`
 * once when a round ends.
 */
export function GameLauncher({ game }: { game: GameDefinition }) {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  const onFinish = useCallback((next: GameResult) => {
    setResult(next);
    setShared(null);
  }, []);

  // A restart clears the result and bumps `round`, which remounts RoundHost so
  // the stopwatch and the game state both return to their starting point.
  const restart = useCallback(() => {
    setResult(null);
    setShared(null);
    setRound((r) => r + 1);
  }, []);

  const shareText = useMemo(() => {
    if (!result) return "";
    return `I scored ${result.score} ${game.scoreRule.unit} in ${game.title} on the REFI Foundation Games for Charity hub. Can you beat it? Play free: https://www.refifoundation.com/play/${game.slug}`;
  }, [result, game]);

  async function share() {
    const data = { title: "REFI Foundation Games for Charity", text: shareText, url: `https://www.refifoundation.com/play/${game.slug}` };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        setShared("Score shared.");
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setShared("Score copied - paste it to a friend.");
    } catch {
      // A cancelled share sheet is not an error worth surfacing.
      setShared(null);
    }
  }

  return (
    <>
      <RoundHost key={round} game={game} onFinish={onFinish} onRestart={restart} />

      {result && (
        <div className={styles.overlayActions} style={{ justifyContent: "flex-start", marginTop: 18 }}>
          <button type="button" className={styles.ghost} style={{ background: "#fff", color: "var(--refi-blue-900)", borderColor: "var(--refi-border-strong)" }} onClick={share}>
            <Share2 size={16} aria-hidden="true" /> Share score
          </button>
          <Link className={styles.ghost} style={{ background: "#fff", color: "var(--refi-blue-900)", borderColor: "var(--refi-border-strong)" }} href="/donate">
            <HeartHandshake size={16} aria-hidden="true" /> Support the Foundation
          </Link>
        </div>
      )}
      {shared && (
        <p role="status" style={{ marginTop: 10, color: "var(--refi-ink-soft)" }}>
          {shared}
        </p>
      )}

      <div className={styles.notice}>
        <strong>Your score stays on this device.</strong> Scores are not submitted, stored or ranked yet, so this is a
        local result only. Playing does not create a donation and a score is not money raised, a reward or a prize. If
        you choose to give, support reaches the Foundation through Paystack.
      </div>
    </>
  );
}
