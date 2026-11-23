import Link from "next/link";
import { ArrowRight, HeartHandshake, Trophy } from "lucide-react";
import { GAMES } from "@/lib/games/catalog";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import styles from "../engagement.module.css";

/**
 * The leaderboard is intentionally empty.
 *
 * The hub's games keep their scores on the player's own device, and /api/scores
 * validates a submission but declines to store it, because a browser-reported
 * score cannot be shown to be genuine without a server-issued game session.
 * Rather than publish placeholder rows, this page states that plainly and lists
 * the score rule each game will be ranked by.
 */
export default function LeaderboardPage() {
  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Leaderboard</div>
          <h1>Every score is an invitation to play.</h1>
          <p>The public leaderboard will show verified game scores and, later, fundraising performance. We will not publish fake rankings or placeholder totals.</p>
        </div>
      </section>
      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.empty}>
            <Trophy size={34} />
            <h2>No verified scores yet.</h2>
            <p>Scores are not being recorded yet, so there is nothing to rank. Each game keeps your score on your own device for the length of a round; it is validated but not stored.</p>
            <div className={styles.actions} style={{ justifyContent: "center" }}>
              <Link className={styles.primary} href="/play">Play a game <ArrowRight size={16} /></Link>
              <Link className={styles.secondary} href="/donate">Support Refi <HeartHandshake size={16} /></Link>
            </div>
          </div>
          <div style={{ marginTop: 40 }} className={styles.card}>
            <h3>Games that will be ranked</h3>
            <p>Each game scores differently, so a ranking will always be per game rather than one combined table.</p>
            <ul style={{ margin: "14px 0 0", paddingLeft: 20, color: "var(--refi-ink-soft)" }}>
              {GAMES.map((game) => (
                <li key={game.slug} style={{ marginBottom: 8 }}>
                  <strong style={{ color: "var(--refi-ink)" }}>{game.title}</strong> ({game.category}) — {game.scoreRule.how} Scored in {game.scoreRule.unit}.
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: 40 }} className={styles.card}>
            <h3>Leaderboard rules</h3>
            <p>Scores will only appear once they are tied to a server-generated game session and validated on the server, because a score reported by the browser can be edited. The submission endpoint already rejects malformed, out-of-range and implausible scores; what it cannot yet do is prove a round was played, so it stores nothing. Fundraising totals only count successfully verified Paystack transactions. This keeps competition and donation reporting separate and auditable.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
