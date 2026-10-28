"use client";

import Link from "next/link";
import { ArrowRight, Brain, Goal, Grid3X3, HeartHandshake, Layers, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { GAMES } from "@/lib/games/catalog";
import type { GameCategory } from "@/lib/games/types";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import styles from "./play.module.css";

const CATEGORY_ICON: Record<GameCategory, typeof Brain> = {
  Brain: Brain,
  Puzzle: Grid3X3,
  Arcade: Layers,
  Sports: Goal,
};

const CATEGORIES: GameCategory[] = ["Brain", "Puzzle", "Arcade", "Sports"];

/**
 * Games for Charity hub.
 *
 * Every card links to a real, playable route generated from the game catalog,
 * so the hub cannot advertise a game that does not exist.
 */
export default function PlayHubPage() {
  const [filter, setFilter] = useState<GameCategory | "All">("All");

  const visible = useMemo(() => (filter === "All" ? GAMES : GAMES.filter((g) => g.category === filter)), [filter]);

  return (
    <main className={styles.hub}>
      <SiteHeader />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Games for Charity</div>
          <h1>Play for free. Support something that matters.</h1>
          <p>
            Short games across Brain, Puzzle, Arcade and Sports. No account, no payment and no download. Play for the
            challenge, then support the Foundation&apos;s work if you choose to.
          </p>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>
              Choose a game
            </div>
            <h2>Every game is playable right now.</h2>
            <p>Filter by category, or scroll the full set. Each game shows its own score rule before you start.</p>
          </div>

          <div className={styles.filters} role="group" aria-label="Filter games by category">
            {(["All", ...CATEGORIES] as const).map((category) => (
              <button
                key={category}
                type="button"
                className={[styles.filter, filter === category ? styles.filterActive : ""].join(" ")}
                onClick={() => setFilter(category)}
                aria-pressed={filter === category}
              >
                {category}
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            {visible.map((game) => {
              const Icon = CATEGORY_ICON[game.category];
              return (
                <article className={styles.card} key={game.slug}>
                  <div className={styles.cardTop}>
                    <span className={styles.badge}>
                      <Icon size={14} aria-hidden="true" /> {game.category}
                    </span>
                    <span className={styles.rule}>Score: {game.scoreRule.unit}</span>
                  </div>
                  <h3>{game.title}</h3>
                  <p>{game.blurb}</p>
                  <p className={styles.rule}>How it scores: {game.scoreRule.how}</p>
                  <Link className={styles.cardAction} href={`/play/${game.slug}`}>
                    Play {game.title} <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>

          {visible.length === 0 && (
            <div className={styles.notice}>
              <strong>No games in this category yet.</strong> Choose another category or view all games.
            </div>
          )}

          <div className={styles.notice} style={{ marginTop: 40 }}>
            <strong>Play free, give if you wish.</strong> Gameplay never requires a payment, and a score is not a
            donation. Donations are separate and optional, and are verified through Paystack before they are reported.
          </div>

          <div className={styles.overlayActions} style={{ justifyContent: "flex-start", marginTop: 26 }}>
            <Link className={styles.primary} href="/donate">
              <HeartHandshake size={16} aria-hidden="true" /> Support the Foundation
            </Link>
            <Link
              className={styles.ghost}
              style={{ background: "#fff", color: "var(--refi-blue-900)", borderColor: "var(--refi-border-strong)" }}
              href="/leaderboard"
            >
              <Target size={16} aria-hidden="true" /> How the leaderboard will work
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
