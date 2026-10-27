"use client";

import Link from "next/link";
import { ArrowRight, HeartHandshake, RotateCcw, Share2, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import styles from "../engagement.module.css";

const GAME_SECONDS = 30;

// One tap per target, and the target moves on every hit, so the score is a
// reflex count rather than anything worth manipulating.
export default function PlayPage() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [shared, setShared] = useState<string | null>(null);
  const targetRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const moveTarget = useCallback(() => {
    setPosition({ x: 12 + Math.random() * 76, y: 15 + Math.random() * 70 });
  }, []);

  const start = useCallback(() => {
    setScore(0);
    setSeconds(GAME_SECONDS);
    setShared(null);
    setRunning(true);
    moveTarget();
  }, [moveTarget]);

  const hit = useCallback(() => {
    if (!running) return;
    setScore((s) => s + 1);
    moveTarget();
  }, [running, moveTarget]);

  // Keep keyboard focus on the target as it moves so the game is playable
  // without a pointer.
  useEffect(() => {
    if (running) targetRef.current?.focus();
  }, [running, position]);

  const finished = !running && seconds === 0;
  const challengeText = `I scored ${score} in the REFI Foundation 30-second challenge. Can you beat it? Play free and support the Foundation: https://www.refifoundation.com/play`;

  async function shareChallenge() {
    const data = { title: "REFI Foundation Challenge", text: challengeText, url: "https://www.refifoundation.com/play" };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        setShared("Challenge shared.");
        return;
      }
      await navigator.clipboard.writeText(challengeText);
      setShared("Challenge copied — paste it to a friend.");
    } catch {
      // A cancelled share sheet is not an error worth surfacing.
      setShared(null);
    }
  }

  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Play for Impact</div>
          <h1>Play. Challenge yourself. Create impact.</h1>
          <p>Start with the Refi Challenge: a short browser game designed to make participation the first step towards supporting the Foundation.</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="#game">Play the challenge <ArrowRight size={16} /></a>
            <Link className={styles.secondary} href="/donate">Give directly <HeartHandshake size={16} /></Link>
          </div>
        </div>
      </section>

      <section id="game" className={styles.body}>
        <div className={styles.container}>
          <div className={styles.grid2}>
            <div className={styles.game}>
              <div className={styles.gameTop}>
                <div className={styles.metric}><strong>{score}</strong><span>Score</span></div>
                <div className={styles.metric}><strong>{seconds}s</strong><span>Time left</span></div>
                <div className={styles.metric}><strong>{GAME_SECONDS}</strong><span>Seconds</span></div>
              </div>
              <div className={styles.arena}>
                {finished ? (
                  <div className={styles.gameMessage}>
                    <div>
                      <Trophy size={32} />
                      <h2>Challenge complete.</h2>
                      <div className={styles.score}>{score}</div>
                      <p>Can a friend beat your score?</p>
                      <div className={styles.actions}>
                        <button className={styles.primary} onClick={start}><RotateCcw size={16} /> Play again</button>
                        <button className={styles.secondary} onClick={shareChallenge}><Share2 size={16} /> Challenge a friend</button>
                        <Link className={styles.secondary} href="/donate">Support Refi</Link>
                      </div>
                      {shared && <p role="status" className={styles.note}>{shared}</p>}
                    </div>
                  </div>
                ) : !running ? (
                  <div className={styles.gameMessage}>
                    <div>
                      <Trophy size={32} />
                      <h2>Ready?</h2>
                      <p>Tap the target as many times as you can in {GAME_SECONDS} seconds. You can also press Enter or Space when the target has focus.</p>
                      <div className={styles.actions}><button className={styles.primary} onClick={start}>Start challenge</button></div>
                    </div>
                  </div>
                ) : (
                  <button
                    ref={targetRef}
                    aria-label="Hit target"
                    className={styles.target}
                    style={{ left: position.x + "%", top: position.y + "%" }}
                    onClick={hit}
                  />
                )}
              </div>
            </div>
            <div>
              <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>Why we&apos;re building this</div>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.02, margin: "12px 0 18px" }}>Participation before persuasion.</h2>
              <p style={{ fontSize: 18, color: "var(--refi-ink-soft)" }}>The game is deliberately simple. It gives people a reason to stay, play and share before asking them to give.</p>
              <div className={styles.note}>Playing does not create a donation. Your score is a game result, not a donation, a reward or a prize, and Refi will never require payment to play. If you choose to give, support reaches the Foundation through Paystack.</div>
              <div className={styles.actions}>
                <Link className={styles.primary} href="/fundraise">Turn play into a fundraiser <ArrowRight size={16} /></Link>
                <button className={styles.secondary} onClick={shareChallenge}><Share2 size={16} /> Share the challenge</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
