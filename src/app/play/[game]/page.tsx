import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { GAMES, getGame } from "@/lib/games/catalog";
import { SiteFooter, SiteHeader } from "../../_components/site-chrome";
import { GameLauncher } from "../_components/game-launcher";
import styles from "../play.module.css";

/** Pre-render one route per published game. */
export function generateStaticParams() {
  return GAMES.map((game) => ({ game: game.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game: slug } = await params;
  const game = getGame(slug);
  if (!game) return { title: "Game not found" };
  return {
    title: `${game.title} · Games for Charity`,
    description: game.blurb,
    alternates: { canonical: `/play/${game.slug}` },
  };
}

/**
 * A single game route.
 *
 * The game is resolved from the catalog, so an unknown slug is a genuine 404
 * rather than a blank page. Instructions and the score rule are rendered from
 * the same definition the hub uses.
 */
export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game: slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  return (
    <main className={styles.hub}>
      <SiteHeader />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Link href="/play" className={styles.eyebrow} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <ArrowLeft size={14} aria-hidden="true" /> Games for Charity
          </Link>
          <h1>{game.title}</h1>
          <p>{game.blurb}</p>
          <span className={styles.badge} style={{ marginTop: 16, background: "rgba(255,255,255,.12)", color: "#fff" }}>
            {game.category}
          </span>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          <GameLauncher game={game} />

          <div className={styles.sectionHead} style={{ marginTop: 40 }}>
            <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>
              How to play
            </div>
            <h2>{game.title} instructions.</h2>
          </div>
          <ol className={styles.instructions} style={{ color: "var(--refi-ink-soft)", maxWidth: 720, margin: 0, paddingLeft: 22 }}>
            {game.howToPlay.map((step) => (
              <li key={step} style={{ marginBottom: 6 }}>
                {step}
              </li>
            ))}
          </ol>
          <p className={styles.rule} style={{ marginTop: 14 }}>
            Controls: {game.controls}
          </p>
          <p className={styles.rule}>Score rule: {game.scoreRule.how}</p>

          <div className={styles.overlayActions} style={{ justifyContent: "flex-start", marginTop: 28 }}>
            <Link className={styles.primary} href="/donate">
              <HeartHandshake size={16} aria-hidden="true" /> Support the Foundation
            </Link>
            <Link
              className={styles.ghost}
              style={{ background: "#fff", color: "var(--refi-blue-900)", borderColor: "var(--refi-border-strong)" }}
              href="/play"
            >
              All games
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
