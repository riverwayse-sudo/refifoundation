import Link from "next/link";
import { ArrowRight, HeartHandshake, Trophy, Users } from "lucide-react";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import { getCampaignTotals } from "@/lib/donations";
import styles from "../engagement.module.css";

export const dynamic = "force-dynamic";

/**
 * The campaign figure shown here comes from persisted, verified donations only.
 * When storage is not configured the page says the figure is unavailable rather
 * than rendering a zero or an invented total.
 */
export default async function FundraisePage() {
  const totals = await getCampaignTotals("REFI Play for Impact");

  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Fundraise</div>
          <h1>Turn your challenge into a campaign.</h1>
          <p>Play alone, challenge friends or rally a team. Fundraising turns a personal action into shared support for REFI Foundation.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/play">Start with a game <ArrowRight size={16} /></Link>
            <Link className={styles.secondary} href="/donate">Make a donation <HeartHandshake size={16} /></Link>
          </div>
        </div>
      </section>
      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.card} style={{ marginBottom: 28 }}>
            <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>Campaign status</div>
            {totals.available ? (
              <>
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 44, lineHeight: 1.04 }}>
                  {formatMoney(totals.totalMinor, totals.currency)} raised
                </h2>
                <p>From {totals.donationCount.toLocaleString()} verified {totals.donationCount === 1 ? "donation" : "donations"} through Paystack. Updated {new Date(totals.updatedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} WAT.</p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 40, lineHeight: 1.04 }}>Campaign totals are not available yet.</h2>
                <p>
                  {totals.reason === "not-configured"
                    ? "Donation storage is not configured on this deployment yet, so the Foundation is not publishing a fundraising total."
                    : "The donation store could not be read, so no fundraising total is being reported."}
                </p>
              </>
            )}
          </div>

          <div className={styles.grid3}>
            <article className={styles.card}>
              <Users size={26} />
              <h2>Challenge friends</h2>
              <p>Share your score and invite people to beat it. The challenge becomes the invitation.</p>
              <Link className={styles.cardAction} href="/play">Play first <ArrowRight size={16} /></Link>
            </article>
            <article className={styles.card}>
              <Trophy size={26} />
              <h2>Set a target</h2>
              <p>Create a campaign around a personal, team or community fundraising goal once campaign creation is enabled.</p>
              <span className={styles.cardAction}>Campaign setup coming next</span>
            </article>
            <article className={styles.card}>
              <HeartHandshake size={26} />
              <h2>Show the impact</h2>
              <p>Donors should understand what their support contributes to, with evidence rather than invented promises.</p>
              <Link className={styles.cardAction} href="/impact">See our approach <ArrowRight size={16} /></Link>
            </article>
          </div>

          <div style={{ marginTop: 70 }} className={styles.grid2}>
            <div>
              <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>How it will work</div>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(38px,5vw,58px)", lineHeight: 1.03 }}>One journey, four steps.</h2>
            </div>
            <div>
              <ol style={{ margin: 0, paddingLeft: 24, fontSize: 18, lineHeight: 1.8 }}>
                <li>Play a Refi challenge.</li>
                <li>Share your score or create a campaign.</li>
                <li>Invite friends, teams or supporters.</li>
                <li>Track donations and campaign progress.</li>
              </ol>
              <div className={styles.note} style={{ marginTop: 24 }}>Individual fundraiser pages and campaign creation are the next implementation layer. No fabricated fundraising totals are displayed before real payment data exists.</div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function formatMoney(amountMinor: number, currency: string) {
  const value = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}
