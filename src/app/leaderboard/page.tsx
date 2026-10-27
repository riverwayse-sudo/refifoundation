import Link from "next/link";
import { ArrowRight, HeartHandshake, Trophy } from "lucide-react";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import styles from "../engagement.module.css";

/**
 * The leaderboard is intentionally empty.
 *
 * No score is submitted anywhere today: the game keeps its score in component
 * state only, so there is no ranking to manipulate and no server-side score to
 * validate yet. Rather than publish placeholder rows, this page states that
 * plainly. When scores are persisted, they must be validated server-side (a
 * browser-reported score is not trustworthy) before anything appears here.
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
            <p>Scores are not being recorded yet, so there is nothing to rank. The game keeps your score on your own device for the length of a round; it is not submitted or stored.</p>
            <div className={styles.actions} style={{ justifyContent: "center" }}>
              <Link className={styles.primary} href="/play">Play the challenge <ArrowRight size={16} /></Link>
              <Link className={styles.secondary} href="/donate">Support Refi <HeartHandshake size={16} /></Link>
            </div>
          </div>
          <div style={{ marginTop: 40 }} className={styles.card}>
            <h3>Leaderboard rules</h3>
            <p>Scores will only appear once they are tied to a server-generated game session and validated on the server, because a score reported by the browser can be edited. Fundraising totals will only count successfully verified Paystack transactions. This keeps competition and donation reporting separate and auditable.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
