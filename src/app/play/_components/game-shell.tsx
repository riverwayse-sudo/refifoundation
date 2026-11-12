"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import styles from "../play.module.css";

export type Metric = { label: string; value: ReactNode };

/** Result of a finished round, reported once by a game component. */
export type GameResult = { score: number; durationMs: number; completed: boolean };

/**
 * Props every game component receives. `elapsed` is the route's round timer,
 * supplied so games do not each run their own clock; a game that tracks time
 * itself may ignore it. A game calls `onStart` when a round actually begins, so
 * the timer excludes time spent on the intro screen, and `onRestart` to ask the
 * launcher for a fresh round, which remounts the game and resets the timer and
 * result. A game's own "Play again" must call `onRestart`, not just reset its
 * local state.
 */
export type GameProps = {
  onFinish: (result: GameResult) => void;
  onStart: () => void;
  onRestart: () => void;
  elapsed: number;
};

/**
 * Shared frame for every game: title, live metrics, restart control and a
 * stage area. Each game supplies only its own body, so the hub stays visually
 * consistent and no game has to re-implement the chrome.
 */
export function GameShell({
  title,
  metrics,
  onRestart,
  restartLabel = "Restart",
  showRestart,
  children,
}: {
  title: string;
  metrics: Metric[];
  onRestart: () => void;
  restartLabel?: string;
  showRestart: boolean;
  children: ReactNode;
}) {
  return (
    <section className={styles.stage} aria-label={`${title} game`}>
      <div className={styles.stageTop}>
        <div className={styles.metrics}>
          {metrics.map((metric) => (
            <div className={styles.metric} key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
        {showRestart && (
          <div className={styles.stageActions}>
            <button type="button" className={styles.ghost} onClick={onRestart}>
              <RotateCcw size={16} aria-hidden="true" /> {restartLabel}
            </button>
          </div>
        )}
      </div>
      <div className={styles.stageBody}>{children}</div>
    </section>
  );
}

/** Centred panel used for start, result and unavailable states. */
export function Overlay({
  icon,
  heading,
  children,
  actions,
}: {
  icon?: ReactNode;
  heading: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.overlay}>
      <div>
        {icon}
        <h3>{heading}</h3>
        {children}
        {actions && <div className={styles.overlayActions}>{actions}</div>}
      </div>
    </div>
  );
}

/** Numbered instructions list, reused by every game's start state. */
export function Instructions({ steps }: { steps: string[] }) {
  return (
    <ol className={styles.instructions}>
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}
