"use client";

import { Goal, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { outcomeLabel, penaltyScore, resolvePenalty, PENALTY_TAKERS, type PenaltyOutcome, type PenaltyDirection } from "@/lib/games/penalty";
import { GameShell, Instructions, Overlay, type GameProps } from "./game-shell";
import styles from "../play.module.css";

type Phase = "intro" | "playing" | "done";

const DIRECTION_LABELS: Record<PenaltyDirection, string> = { left: "Left", centre: "Centre", right: "Right" };
const KEEPER_CLASS: Record<PenaltyDirection, string> = { left: styles.keeperLeft, centre: styles.keeperCentre, right: styles.keeperRight };

export function CharityPenalty({ onFinish, onStart, onRestart, elapsed }: GameProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [history, setHistory] = useState<PenaltyOutcome[]>([]);
  const [current, setCurrent] = useState<PenaltyOutcome | null>(null);
  const [startedAt, setStartedAt] = useState(0);

  const goals = history.filter((o) => o.scored).length;
  const saves = history.length - goals;
  const taken = history.length;
  const remaining = PENALTY_TAKERS - taken;
  const finished = phase === "done";

  const start = useCallback(() => {
    setHistory([]);
    setCurrent(null);
    setStartedAt(Date.now());
    setPhase("playing");
    onStart();
  }, [onStart]);

  const shoot = useCallback(
    (shot: PenaltyDirection) => {
      if (phase !== "playing" || current !== null) return;
      const outcome = resolvePenalty(shot);
      setCurrent(outcome);
      const nextHistory = [...history, outcome];
      window.setTimeout(() => {
        setHistory(nextHistory);
        setCurrent(null);
        if (nextHistory.length >= PENALTY_TAKERS) {
          setPhase("done");
          onFinish({
            score: penaltyScore(nextHistory.filter((o) => o.scored).length),
            durationMs: Math.max(1000, Date.now() - startedAt),
            completed: true,
          });
        }
      }, 900);
    },
    [phase, current, history, onFinish, startedAt],
  );

  // Arrow keys choose a direction.
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") shoot("left");
      else if (event.key === "ArrowDown") shoot("centre");
      else if (event.key === "ArrowRight") shoot("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, shoot]);

  const keeperPos: PenaltyDirection = current?.keeper ?? "centre";

  if (phase === "intro") {
    return (
      <GameShell title="Charity Penalty Challenge" metrics={[]} onRestart={onRestart} showRestart={false}>
        <Overlay
          icon={<Goal size={32} aria-hidden="true" />}
          heading="Charity Penalty Challenge"
          actions={
            <button type="button" className={styles.primary} onClick={start}>
              Take five penalties
            </button>
          }
        >
          <Instructions steps={[`You take ${PENALTY_TAKERS} penalties.`, "Choose left, centre or right before each kick.", "The keeper dives one way. If you pick differently, you score.", "Your score is the goals you score out of five."]} />
        </Overlay>
      </GameShell>
    );
  }

  if (finished) {
    return (
      <GameShell
        title="Charity Penalty Challenge"
        metrics={[{ label: "Goals", value: `${goals}/${PENALTY_TAKERS}` }, { label: "Saved", value: saves }, { label: "Time", value: `${elapsed}s` }]}
        onRestart={onRestart}
        showRestart={false}
      >
        <Overlay
          heading={goals === PENALTY_TAKERS ? "Perfect record." : "Shoot-out complete."}
          actions={
            <button type="button" className={styles.primary} onClick={onRestart}>
              <RotateCcw size={16} aria-hidden="true" /> Play again
            </button>
          }
        >
          <div className={styles.bigScore}>{goals}</div>
          <p>
            {goals} {goals === 1 ? "goal" : "goals"} from {PENALTY_TAKERS} penalties. {saves} {saves === 1 ? "save" : "saves"}.
          </p>
          <div className={styles.tally}>
            {history.map((outcome, i) => (
              <div className={styles.tallyRow} key={i}>
                <span>Penalty {i + 1}: {DIRECTION_LABELS[outcome.shot]}</span>
                <strong>{outcomeLabel(outcome)}</strong>
              </div>
            ))}
          </div>
        </Overlay>
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Charity Penalty Challenge"
      metrics={[{ label: "Penalty", value: `${taken + 1}/${PENALTY_TAKERS}` }, { label: "Goals", value: goals }, { label: "Left", value: remaining }]}
      onRestart={onRestart}
      showRestart
    >
      <div className={styles.pitch} aria-hidden="true">
        <div className={styles.goal} />
        <div className={[styles.keeper, KEEPER_CLASS[keeperPos]].join(" ")} />
        <div className={styles.ball} />
      </div>
      <div className={styles.directions}>
        {(["left", "centre", "right"] as PenaltyDirection[]).map((dir) => (
          <button key={dir} type="button" className={styles.direction} onClick={() => shoot(dir)} disabled={current !== null}>
            {DIRECTION_LABELS[dir]}
          </button>
        ))}
      </div>
      <p className={styles.srOnly} role="status">
        {current ? (current.scored ? `Goal. The keeper dived ${DIRECTION_LABELS[current.keeper]}.` : `Saved. The keeper dived ${DIRECTION_LABELS[current.keeper]}.`) : `Penalty ${taken + 1} of ${PENALTY_TAKERS}. Choose a direction.`}
      </p>
      {current && (
        <p className={styles.feedback} style={{ background: "rgba(255,255,255,.08)", color: "#fff" }}>
          {current.scored ? "Goal! " : "Saved. "}You went {DIRECTION_LABELS[current.shot].toLowerCase()}, the keeper went {DIRECTION_LABELS[current.keeper].toLowerCase()}.
        </p>
      )}
    </GameShell>
  );
}
