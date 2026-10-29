import Link from "next/link";
import { ArrowRight, CheckCircle2, HeartHandshake, ShieldAlert } from "lucide-react";
import { SiteFooter, SiteHeader } from "../../_components/site-chrome";
import { paystackSecret, verifyTransaction } from "@/lib/paystack";
import { persistenceConfigured } from "@/lib/donations";
import styles from "../../engagement.module.css";

export const dynamic = "force-dynamic";

/**
 * Donation status page.
 *
 * The reference comes from the query string, but the *status* never does: it is
 * read back from Paystack on the server. A cancelled or abandoned checkout
 * therefore cannot be presented as a confirmed donation by editing the URL.
 */
export default async function DonationSuccess({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  const configured = paystackSecret() !== null;
  const result = reference ? await verifyTransaction(reference) : null;

  const ok = result?.ok === true;
  const amount = result?.amountMinor ?? null;
  const currency = result?.currency || "NGN";
  const message = result?.error ?? (reference ? "We could not verify this payment." : "No payment reference was supplied.");

  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Donation status</div>
          <h1>{ok ? "Thank you for supporting REFI." : "We need to confirm your payment."}</h1>
          <p>{ok ? "Your payment has been verified with Paystack." : "Please contact the Foundation if you completed payment and this page does not confirm it."}</p>
        </div>
      </section>
      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.card} style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            {ok ? (
              <>
                <CheckCircle2 size={48} />
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 48 }}>Donation confirmed.</h2>
                {amount !== null && <p style={{ fontSize: 20 }}>{formatAmount(amount, currency)}</p>}
                <p>Reference: <strong>{result?.reference}</strong></p>
                {!persistenceConfigured() && (
                  <p className={styles.note}>This payment is verified. Donation records and campaign totals are not being stored yet, so the Foundation reconciles gifts from Paystack directly until storage is configured.</p>
                )}
              </>
            ) : (
              <>
                <ShieldAlert size={48} />
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 42 }}>Verification incomplete.</h2>
                <p>{message}</p>
                {!configured && <p className={styles.note}>Payment verification is not configured on this deployment yet.</p>}
              </>
            )}
            <div className={styles.actions} style={{ justifyContent: "center" }}>
              <Link className={styles.primary} href="/play">Play for Impact <ArrowRight size={16} /></Link>
              <Link className={styles.secondary} href="/donate">Give again <HeartHandshake size={16} /></Link>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function formatAmount(amountMinor: number, currency: string) {
  const value = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}
