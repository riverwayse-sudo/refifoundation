import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { GAMES } from "@/lib/games/catalog";
import { getTopScores, type Leaderboard } from "@/lib/games/leaderboard";
import { listTopFundraisers, type Fundraiser } from "@/lib/fundraisers";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import styles from "../engagement.module.css";

export const revalidate = 30;

/**
 * The leaderboard shows stored, verified rounds only.
 *
 * A score reaches this page only when it arrived through /api/scores with a
 * signed session token and the store accepted it. When storage is not
 * configured, or the store cannot be read, the page says so for each game rather
 * than rendering an empty table that would read as "nobody has played".
 */
export default async function LeaderboardPage() {
  const [boards, topFundraisers] = await Promise.all([
    Promise.all(GAMES.map(async (game) => ({ game, board: await getTopScores(game.slug) }))),
    listTopFundraisers(5),
  ]);

  const anyUnavailable = boards.some(({ board }) => !board.available);

  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Leaderboard</div>
          <h1>Every score is an invitation to play.</h1>
          <p>Only rounds that the server registered and verified are ranked here. A score is never presented as a donation or as money raised.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/play">Play a game <ArrowRight size={16} /></Link>
            <Link className={styles.secondary} href="/donate">Support Refi <HeartHandshake size={16} /></Link>
          </div>
        </div>
      </section>
      <section className={styles.body}>
        <div className={styles.container}>
          {anyUnavailable && (
            <div className={styles.note} style={{ marginBottom: 24 }} role="status">
              Some rankings cannot be read right now. Where that is the case, this page says so instead of showing an
              empty table. It never publishes a score that was not stored.
            </div>
          )}

          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 34, margin: "0 0 8px" }}>Most raised</h2>
          <p style={{ marginTop: 0, color: "var(--refi-ink-soft)" }}>
            Campaign totals are sums of donations that Paystack confirmed. They are not estimates, and a campaign with no
            confirmed gift is not shown as a winner.
          </p>
          <FundraiserBoard list={topFundraisers} />

          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 34, margin: "48px 0 8px" }}>Top scores</h2>
          <div className={styles.grid2}>
            {boards.map(({ game, board }) => (
              <article className={styles.card} key={game.slug}>
                <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>{game.category}</div>
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 30, lineHeight: 1.1 }}>
                  {game.title}
                </h2>
                <Board board={board} unit={game.scoreRule.unit} slug={game.slug} />
              </article>
            ))}
          </div>

          <div style={{ marginTop: 40 }} className={styles.card}>
            <h3>Leaderboard rules</h3>
            <p>
              Each game is ranked separately, because each game scores differently. A round is registered on the server
              when it starts, so the duration is measured by the server and the score must sit inside the bounds the game
              declares. One submission per round is accepted: replaying the same round does not create a second entry.
            </p>
            <p style={{ marginBottom: 0 }}>
              Display names are reduced to letters, numbers and spaces. Email addresses and links are refused. Fundraising
              totals are counted separately, from verified Paystack transactions only.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function FundraiserBoard({ list }: { list: Awaited<ReturnType<typeof listTopFundraisers>> }) {
  if (!list.available) {
    return (
      <p className={styles.note} role="status" style={{ marginTop: 12 }}>
        {list.reason === "not-configured"
          ? "Campaign rankings are not enabled on this deployment yet, so none are shown."
          : "Campaign totals could not be read just now, so no campaign ranking is shown."}
      </p>
    );
  }

  const ranked = list.items.filter((item) => item.totalMinor > 0);
  if (ranked.length === 0) {
    return (
      <p className={styles.note} role="status" style={{ marginTop: 12 }}>
        No campaign has a confirmed donation yet. <Link href="/fundraise/start" style={{ fontWeight: 700 }}>Start one</Link>{" "}
        and set the first total.
      </p>
    );
  }

  return (
    <ol style={{ margin: "14px 0 0", paddingLeft: 0, listStyle: "none" }}>
      {ranked.map((campaign: Fundraiser, index: number) => (
        <li
          key={campaign.slug}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 0",
            borderTop: index === 0 ? "none" : "1px solid var(--refi-border)",
          }}
        >
          <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
            <strong style={{ minWidth: 22, color: "var(--refi-blue-700)" }}>{index + 1}</strong>
            <Link href={`/fundraise/${campaign.slug}`}>{campaign.title}</Link>
            <span style={{ color: "var(--refi-ink-soft)" }}>by {campaign.organiserName}</span>
          </span>
          <span style={{ fontWeight: 700 }}>{formatMoney(campaign.totalMinor)}</span>
        </li>
      ))}
    </ol>
  );
}

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amountMinor / 100);
}

function Board({ board, unit, slug }: { board: Leaderboard; unit: string; slug: string }) {
  if (!board.available) {
    return (
      <p className={styles.note} role="status">
        {board.reason === "not-configured"
          ? "Rankings are not enabled on this deployment yet, so no scores are published."
          : "This ranking could not be read just now. No scores are being published from an unread table."}
      </p>
    );
  }

  if (board.rows.length === 0) {
    return (
      <p className={styles.note} role="status">
        No verified scores for this game yet.{" "}
        <Link href={`/play/${slug}`} style={{ fontWeight: 700 }}>Play {slug.replace(/-/g, " ")}</Link> to set the first one.
      </p>
    );
  }

  return (
    <ol style={{ margin: "14px 0 0", paddingLeft: 0, listStyle: "none" }}>
      {board.rows.map((row, index) => (
        <li
          key={`${row.createdAt}-${index}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 0",
            borderTop: index === 0 ? "none" : "1px solid var(--refi-border)",
          }}
        >
          <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
            <strong style={{ minWidth: 22, color: "var(--refi-blue-700)" }}>{index + 1}</strong>
            <span>{row.displayName}</span>
          </span>
          <span style={{ fontWeight: 700 }}>
            {row.score.toLocaleString("en-NG")} <span style={{ fontWeight: 400, color: "var(--refi-ink-soft)" }}>{unit}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
