import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../_components/site-chrome";
import { getFundraiser } from "@/lib/fundraisers";
import { ShareFundraiser } from "../_components/share-fundraiser";
import styles from "../../engagement.module.css";

export const revalidate = 30;

/**
 * One campaign.
 *
 * The figure is the confirmed total from the database view, never a projection.
 * A campaign that does not exist, is hidden, or cannot be read is not rendered
 * with a zero: it is either absent (404) or explicitly unavailable.
 */
export default async function FundraiserPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getFundraiser(slug);

  if (!result.available && result.reason === "missing") notFound();

  if (!result.available) {
    return (
      <main className={styles.shell}>
        <SiteHeader />
        <section className={styles.body}>
          <div className={styles.container}>
            <div className={styles.card}>
              <h1 style={{ fontSize: 34 }}>This campaign cannot be shown right now.</h1>
              <p role="status">
                {result.reason === "not-configured"
                  ? "Campaign storage is not configured on this deployment yet."
                  : "The campaign could not be read just now. No total is being shown, because none could be confirmed."}
              </p>
              <Link className={styles.cardAction} href="/fundraise">Back to fundraise <ArrowRight size={16} /></Link>
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const campaign = result.fundraiser;
  const hasTarget = typeof campaign.targetMinor === "number" && campaign.targetMinor > 0;
  const percent = hasTarget ? Math.min(100, Math.round((campaign.totalMinor / campaign.targetMinor!) * 100)) : null;
  const donateHref = `/donate?fundraiser=${encodeURIComponent(campaign.slug)}${campaign.game ? `&game=${encodeURIComponent(campaign.game)}` : ""}`;

  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Fundraiser</div>
          <h1>{campaign.title}</h1>
          <p>Organised by {campaign.organiserName}{campaign.game ? ` · ${campaign.game.replace(/-/g, " ")}` : ""}</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={donateHref}>Give to this campaign <HeartHandshake size={16} /></Link>
            <Link className={styles.secondary} href="/fundraise">Other campaigns</Link>
          </div>
        </div>
      </section>
      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.grid2}>
            <div className={styles.card}>
              <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>Confirmed total</div>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 44, lineHeight: 1.04, margin: "6px 0" }}>
                {formatMoney(campaign.totalMinor)}
                {hasTarget ? <span style={{ fontSize: 22, color: "var(--refi-ink-soft)" }}> of {formatMoney(campaign.targetMinor!)}</span> : null}
              </h2>
              <p>
                From {campaign.donationCount} confirmed {campaign.donationCount === 1 ? "donation" : "donations"} through Paystack.
                Only payments that Paystack confirms and that carry this campaign count.
              </p>
              {hasTarget && (
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent ?? 0}
                  aria-label="Campaign progress"
                  style={{ height: 12, background: "var(--refi-blue-50, #eef3fb)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}
                >
                  <div style={{ width: `${percent}%`, height: "100%", background: "var(--refi-red-700, #b3272d)" }} />
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                <ShareFundraiser title={campaign.title} url={`https://www.refifoundation.com/fundraise/${campaign.slug}`} />
              </div>
            </div>
            <div className={styles.card}>
              <h2 style={{ fontSize: 26 }}>Why this campaign</h2>
              {campaign.story ? (
                <p style={{ whiteSpace: "pre-wrap" }}>{campaign.story}</p>
              ) : (
                <p>The organiser has not added a story yet. The campaign total still counts only confirmed donations.</p>
              )}
              <Link className={styles.cardAction} href="/impact">How REFI uses support <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amountMinor / 100);
}
