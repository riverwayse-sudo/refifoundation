"use client";

import { Layers, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { dropBlock, initialBlock, stackScore, stackSpeed, STACK_START_WIDTH, type Block } from "@/lib/games/stack-it";
import { GameShell, Instructions, Overlay, type GameProps } from "./game-shell";
import styles from "../play.module.css";

type Phase = "intro" | "playing" | "over";

const BLOCK_HEIGHT_PX = 26;

export function StackIt({ onFinish, onStart, onRestart, elapsed }: GameProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [blocks, setBlocks] = useState<Block[]>([initialBlock()]);
  const [moverX, setMoverX] = useState(0);
  const [message, setMessage] = useState("");

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const xRef = useRef(0);
  const dirRef = useRef(1);
  const blocksRef = useRef<Block[]>(blocks);
  const startedRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");

  // Mirror render state into refs for the animation frame, which reads outside
  // React's render cycle. Done in effects rather than during render.
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stopLoop();
    const base = [initialBlock()];
    setBlocks(base);
    blocksRef.current = base;
    xRef.current = 0;
    dirRef.current = 1;
    setMoverX(0);
    setMessage("");
    startedRef.current = Date.now();
    setPhase("playing");
    onStart();
  }, [stopLoop, onStart]);

  // Animation loop. Speed rises with tower height so the challenge grows.
  useEffect(() => {
    if (phase !== "playing") {
      stopLoop();
      return;
    }
    lastRef.current = performance.now();
    const step = (now: number) => {
      if (phaseRef.current !== "playing") return;
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      const speed = stackSpeed(blocksRef.current.length);
      let next = xRef.current + dirRef.current * speed * dt;
      if (next >= 100) {
        next = 100;
        dirRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        dirRef.current = 1;
      }
      xRef.current = next;
      setMoverX(next);
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
    return stopLoop;
  }, [phase, stopLoop]);

  const drop = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const current = blocksRef.current;
    const base = current[current.length - 1];
    const result = dropBlock(base, xRef.current);

    if (!result.ok) {
      stopLoop();
      setPhase("over");
      setMessage(result.reason === "miss" ? "The block missed the tower entirely." : "The block became too narrow to stack.");
      onFinish({ score: stackScore(current.length), durationMs: Math.max(1000, Date.now() - startedRef.current), completed: true });
      return;
    }

    const next = [...current, result.block];
    setBlocks(next);
    blocksRef.current = next;
    // Restart the mover from an edge so every drop is a fresh read.
    xRef.current = Math.random() < 0.5 ? 0 : 100;
    dirRef.current = xRef.current === 0 ? 1 : -1;
    setMoverX(xRef.current);
  }, [onFinish, stopLoop]);

  // Space, Enter or click drops the block.
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        drop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, drop]);

  const placed = stackScore(blocks.length);

  if (phase === "intro") {
    return (
      <GameShell title="Stack It" metrics={[]} onRestart={onRestart} showRestart={false}>
        <Overlay
          icon={<Layers size={32} aria-hidden="true" />}
          heading="Stack It"
          actions={
            <button type="button" className={styles.primary} onClick={start}>
              Start stacking
            </button>
          }
        >
          <Instructions steps={["A block slides across the top of the tower.", "Press Space, Enter or click to drop it.", "Only the overlap remains, so the tower narrows.", "Miss the tower completely and the run ends."]} />
        </Overlay>
      </GameShell>
    );
  }

  if (phase === "over") {
    return (
      <GameShell title="Stack It" metrics={[{ label: "Score", value: placed }, { label: "Time", value: `${elapsed}s` }]} onRestart={onRestart} showRestart={false}>
        <Overlay
          heading="Tower collapsed."
          actions={
            <button type="button" className={styles.primary} onClick={onRestart}>
              <RotateCcw size={16} aria-hidden="true" /> Play again
            </button>
          }
        >
          <div className={styles.bigScore}>{placed}</div>
          <p>
            {message} You stacked {placed} {placed === 1 ? "block" : "blocks"}.
          </p>
        </Overlay>
      </GameShell>
    );
  }

  const base = blocks[blocks.length - 1];
  return (
    <GameShell
      title="Stack It"
      metrics={[{ label: "Blocks", value: placed }, { label: "Time", value: `${elapsed}s` }]}
      onRestart={onRestart}
      showRestart
    >
      <div className={styles.stackArea} aria-hidden="true">
        {blocks.map((block, i) => (
          <div
            key={`${i}-${block.x}-${block.width}`}
            className={[styles.block, i === 0 ? styles.blockBase : ""].join(" ")}
            style={{ left: `${block.x - block.width / 2}%`, width: `${block.width}%`, bottom: `${i * BLOCK_HEIGHT_PX}px` }}
          />
        ))}
        <div
          className={styles.mover}
          style={{ left: `${moverX - base.width / 2}%`, width: `${base.width}%`, bottom: `${blocks.length * BLOCK_HEIGHT_PX}px` }}
        />
      </div>
      <div className={styles.overlayActions}>
        <button type="button" className={styles.primary} onClick={drop}>
          Drop block
        </button>
      </div>
      <p className={styles.srOnly} role="status">
        {placed} blocks stacked. Current block width {Math.round(base.width)} percent.
      </p>
      <p className={styles.rule} style={{ color: "rgba(255,255,255,.7)", marginTop: 12 }}>
        Press Space, Enter or the Drop block button to place the sliding block. Starting width is {STACK_START_WIDTH}%.
      </p>
    </GameShell>
  );
}
