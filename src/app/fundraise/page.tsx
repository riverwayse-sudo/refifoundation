import Link from "next/link";
import { ArrowRight, HeartHandshake, Trophy, Users } from "lucide-react";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import { getCampaignTotals } from "@/lib/donations";
import { listFundraisers, type Fundraiser } from "@/lib/fundraisers";
import styles from "../engagement.module.css";

export const revalidate = 30;

/**
 * The fundraising hub.
 *
 * Two kinds of figure appear here, and they are labelled differently on purpose:
 * the Foundation-wide total (all verified donations) and each campaign total
 * (confirmed donations attributed to that campaign). Both are sums of confirmed
 * Paystack payments. Nothing is estimated.
 */
export default async function FundraisePage() {
  const [totals, campaigns] = await Promise.all([
    getCampaignTotals("REFI Play for Impact"),
    listFundraisers(),
  ]);

  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Fundraise</div>
          <h1>Turn your challenge into a campaign.</h1>
          <p>Play alone, challenge friends or rally a team. A campaign gives your round a purpose and a page to share.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/fundraise/start">Start a fundraiser <ArrowRight size={16} /></Link>
            <Link className={styles.secondary} href="/play">Play a game <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.card} style={{ marginBottom: 28 }}>
            <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>Foundation total</div>
            {totals.available ? (
              <>
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 44, lineHeight: 1.04 }}>
                  {formatMoney(totals.totalMinor, totals.currency)} raised
                </h2>
                <p>
                  From {totals.donationCount.toLocaleString()} verified {totals.donationCount === 1 ? "donation" : "donations"} through
                  Paystack. Updated {new Date(totals.updatedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} WAT.
                </p>
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

          <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>Live campaigns</div>
          {!campaigns.available ? (
            <div className={styles.note} role="status" style={{ marginTop: 12 }}>
              {campaigns.reason === "not-configured"
                ? "Campaign pages are not enabled on this deployment yet. When storage is configured, a campaign you create appears here with the total of its confirmed donations."
                : "Campaigns could not be read just now, so none are listed. No campaign total is being guessed."}
            </div>
          ) : campaigns.items.length === 0 ? (
            <div className={styles.note} role="status" style={{ marginTop: 12 }}>
              No campaigns have been created yet.{" "}
              <Link href="/fundraise/start" style={{ fontWeight: 700 }}>Be the first</Link> - it takes one form and one game.
            </div>
          ) : (
            <div className={styles.grid2} style={{ marginTop: 16 }}>
              {campaigns.items.map((campaign) => (
                <CampaignCard key={campaign.slug} campaign={campaign} />
              ))}
            </div>
          )}

          <div style={{ marginTop: 48 }} className={styles.grid3}>
            <article className={styles.card}>
              <Users size={26} />
              <h2>Challenge friends</h2>
              <p>Share your score and invite people to beat it. The challenge becomes the invitation.</p>
              <Link className={styles.cardAction} href="/play">Play first <ArrowRight size={16} /></Link>
            </article>
            <article className={styles.card}>
              <Trophy size={26} />
              <h2>Set a target</h2>
              <p>A campaign carries a goal if you want one. Progress is the sum of confirmed donations, not an estimate.</p>
              <Link className={styles.cardAction} href="/leaderboard">See the leaderboards <ArrowRight size={16} /></Link>
            </article>
            <article className={styles.card}>
              <HeartHandshake size={26} />
              <h2>Show the impact</h2>
              <p>Donors should understand what their support contributes to, with evidence rather than invented promises.</p>
              <Link className={styles.cardAction} href="/impact">See our approach <ArrowRight size={16} /></Link>
            </article>
          </div>

          <div style={{ marginTop: 56 }} className={styles.grid2}>
            <div>
              <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>How it works</div>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(38px,5vw,58px)", lineHeight: 1.03 }}>One journey, four steps.</h2>
            </div>
            <div>
              <ol style={{ margin: 0, paddingLeft: 24, fontSize: 18, lineHeight: 1.8 }}>
                <li>Play a Refi challenge.</li>
                <li>Create a campaign and share its page.</li>
                <li>Invite friends, teams or supporters.</li>
                <li>Watch the campaign total move as payments are confirmed.</li>
              </ol>
              <div className={styles.note} style={{ marginTop: 24 }}>
                A campaign total only counts donations that Paystack confirms and that carry this campaign&apos;s address.
                A replay of the same payment cannot add to it twice.
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function CampaignCard({ campaign }: { campaign: Fundraiser }) {
  const hasTarget = typeof campaign.targetMinor === "number" && campaign.targetMinor > 0;
  const percent = hasTarget ? Math.min(100, Math.round((campaign.totalMinor / campaign.targetMinor!) * 100)) : null;

  return (
    <article className={styles.card}>
      <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>{campaign.organiserName}</div>
      <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 28, lineHeight: 1.15 }}>{campaign.title}</h2>
      <p style={{ margin: "6px 0 12px" }}>
        {formatMoney(campaign.totalMinor, "NGN")} raised
        {hasTarget ? ` of ${formatMoney(campaign.targetMinor!, "NGN")}` : ""} from {campaign.donationCount}{" "}
        {campaign.donationCount === 1 ? "donation" : "donations"}.
      </p>
      {hasTarget && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? 0}
          aria-label={`${campaign.title} progress`}
          style={{ height: 10, background: "var(--refi-blue-50, #eef3fb)", borderRadius: 999, overflow: "hidden" }}
        >
          <div style={{ width: `${percent}%`, height: "100%", background: "var(--refi-red-700, #b3272d)" }} />
        </div>
      )}
      <Link className={styles.cardAction} href={`/fundraise/${campaign.slug}`}>
        Open campaign <ArrowRight size={16} />
      </Link>
    </article>
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
