"use client";

import Link from "next/link";
import { HeartHandshake, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameDefinition } from "@/lib/games/types";
import { BrainBattle } from "./brain-battle";
import { CharityPenalty } from "./charity-penalty";
import { MemoryMatch } from "./memory-match";
import { ReflexRush } from "./reflex-rush";
import { StackIt } from "./stack-it";
import { useElapsed } from "./use-elapsed";
import type { GameResult } from "./game-shell";
import styles from "../play.module.css";

type Session = { token: string };

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
  onRoundStart,
}: {
  game: GameDefinition;
  onFinish: (result: GameResult) => void;
  onRestart: () => void;
  onRoundStart: () => void;
}) {
  const [running, setRunning] = useState(false);
  const elapsed = useElapsed(running);

  const onStart = useCallback(() => {
    setRunning(true);
    onRoundStart();
  }, [onRoundStart]);
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

type SubmissionState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; stored: boolean; message: string }
  | { kind: "error"; message: string };

/**
 * Hosts a single game: owns the round, the most recent result, the optional
 * share action and the optional leaderboard submission.
 *
 * The round's start is registered with the server (`/api/games/session`) so a
 * submitted score is tied to a signed session and a server-measured duration. The
 * score is only submitted when the player asks, and the page states plainly
 * whether it was stored.
 */
export function GameLauncher({ game }: { game: GameDefinition }) {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const [sessionStatus, setSessionStatus] = useState<"idle" | "requesting" | "ready" | "unavailable">("idle");
  const session = useRef<Session | null>(null);
  const sessionRequest = useRef<AbortController | null>(null);

  useEffect(() => () => {
    sessionRequest.current?.abort();
  }, []);

  const startRound = useCallback(() => {
    // A restarted round must not inherit a late response from the previous
    // session request. Abort it and bind the next token to this round only.
    sessionRequest.current?.abort();
    const controller = new AbortController();
    sessionRequest.current = controller;
    session.current = null;
    setSessionStatus("requesting");
    setSubmission({ kind: "idle" });

    void fetch("/api/games/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: game.slug }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { token?: unknown } | null) => {
        if (controller.signal.aborted) return;
        if (body && typeof body.token === "string") {
          session.current = { token: body.token };
          setSessionStatus("ready");
        } else {
          session.current = null;
          setSessionStatus("unavailable");
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        session.current = null;
        setSessionStatus("unavailable");
      });
  }, [game.slug]);

  const onFinish = useCallback((next: GameResult) => {
    setResult(next);
    setShared(null);
  }, []);

  // A restart clears the result and bumps `round`, which remounts RoundHost so
  // the stopwatch and the game state both return to their starting point.
  const restart = useCallback(() => {
    setResult(null);
    setShared(null);
    sessionRequest.current?.abort();
    sessionRequest.current = null;
    session.current = null;
    setSessionStatus("idle");
    setSubmission({ kind: "idle" });
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

  async function submitScore() {
    if (!result) return;
    if (!session.current) {
      setSubmission({
        kind: "error",
        message: sessionStatus === "requesting"
          ? "The server is still registering this round. Wait a moment, then submit again."
          : "This round was not registered with the server, so it cannot be ranked. Your score remains on this device. Start a new round to try again.",
      });
      return;
    }
    setSubmission({ kind: "sending" });
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: game.slug,
          score: result.score,
          durationMs: result.durationMs,
          completed: result.completed,
          displayName,
          sessionToken: session.current.token,
        }),
      });
      const body = await response.json() as {
        ok?: boolean;
        stored?: boolean;
        message?: string;
        error?: string;
        errors?: string[];
      };
      if (!response.ok || !body.ok) {
        setSubmission({
          kind: "error",
          message: body.error || body.errors?.[0] || "The score could not be submitted.",
        });
        return;
      }
      setSubmission({
        kind: "done",
        stored: Boolean(body.stored),
        message: body.message || (body.stored ? "Your score is on the leaderboard." : "This round was not stored."),
      });
    } catch {
      setSubmission({ kind: "error", message: "The score could not be submitted. Check your connection and try again." });
    }
  }

  return (
    <>
      <RoundHost key={round} game={game} onFinish={onFinish} onRestart={restart} onRoundStart={startRound} />

      {result && (
        <div className={styles.overlayActions} style={{ justifyContent: "flex-start", marginTop: 18 }}>
          <button type="button" className={styles.ghost} style={{ background: "#fff", color: "var(--refi-blue-900)", borderColor: "var(--refi-border-strong)" }} onClick={share}>
            <Share2 size={16} aria-hidden="true" /> Share score
          </button>
          <Link className={styles.ghost} style={{ background: "#fff", color: "var(--refi-blue-900)", borderColor: "var(--refi-border-strong)" }} href="/donate">
            <HeartHandshake size={16} aria-hidden="true" /> Support the Foundation
          </Link>
          <Link className={styles.primary} href={`/fundraise/start?game=${encodeURIComponent(game.slug)}`}>
            <HeartHandshake size={16} aria-hidden="true" /> Turn this challenge into a fundraiser
          </Link>
        </div>
      )}
      {shared && (
        <p role="status" style={{ marginTop: 10, color: "var(--refi-ink-soft)" }}>
          {shared}
        </p>
      )}

      {result && submission.kind !== "done" && (
        <div className={styles.notice} style={{ marginTop: 18 }}>
          <label htmlFor={`score-name-${game.slug}`} style={{ display: "block", fontWeight: 700, color: "var(--refi-ink)", marginBottom: 8 }}>
            Name for the leaderboard (optional)
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              id={`score-name-${game.slug}`}
              name="displayName"
              type="text"
              value={displayName}
              maxLength={24}
              autoComplete="nickname"
              placeholder="Player One"
              onChange={(event) => setDisplayName(event.target.value)}
              style={{ minHeight: 44, padding: "0 12px", border: "1px solid var(--refi-border-strong)", font: "inherit" }}
            />
            <button
              type="button"
              className={styles.primary}
              onClick={submitScore}
              disabled={submission.kind === "sending" || sessionStatus === "requesting"}
            >
              {submission.kind === "sending" ? "Submitting..." : sessionStatus === "requesting" ? "Registering round..." : "Submit score"}
            </button>
          </div>
          <p style={{ margin: "10px 0 0", color: "var(--refi-ink-soft)" }}>
            Only letters, numbers and spaces are kept. Do not enter an email address. A score is not money raised.
          </p>
          {submission.kind === "error" && (
            <p role="alert" style={{ margin: "10px 0 0", color: "var(--refi-red-700, #9b1c1c)", fontWeight: 700 }}>
              {submission.message}
            </p>
          )}
        </div>
      )}

      {submission.kind === "done" && (
        <p role="status" className={styles.notice} style={{ marginTop: 18 }}>
          <strong>{submission.stored ? "Score verified and stored." : "Score not stored."}</strong>{" "}
          {submission.message}
        </p>
      )}

      <div className={styles.notice}>
        <strong>A score is not money raised, a reward or a prize.</strong> Rounds started here are registered with the
        server, so a submitted score can be checked and ranked on the leaderboard when verified game sessions are
        enabled. If they are not enabled, the score stays on your device. If you choose to give, support reaches the
        Foundation through Paystack.
      </div>
    </>
  );
}
