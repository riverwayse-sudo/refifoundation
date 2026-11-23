"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import styles from "../engagement.module.css";

const amounts = [5000, 10000, 25000, 50000, 100000, 250000];

export default function DonatePage() {
  // useSearchParams needs a Suspense boundary during static rendering.
  return (
    <Suspense fallback={null}>
      <DonateForm />
    </Suspense>
  );
}

function DonateForm() {
  const params = useSearchParams();
  const fundraiser = params.get("fundraiser") ?? "";
  const game = params.get("game") ?? "";
  const [fundraiserTitle, setFundraiserTitle] = useState("");
  const [amount, setAmount] = useState(25000);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // The campaign title is cosmetic; if it cannot be read, the gift is still
  // attributed by slug, which the server validated when payment started.
  useEffect(() => {
    if (!fundraiser) return;
    let active = true;
    fetch(`/api/fundraisers/${encodeURIComponent(fundraiser)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.available) setFundraiserTitle(data.fundraiser.title);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fundraiser]);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          amount,
          source: fundraiser ? "fundraiser" : "donate",
          fundraiser: fundraiser || undefined,
          game: game || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start payment.");
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · Give</div>
          <h1>Give opportunity a place to grow.</h1>
          <p>
            Make a secure donation through Paystack. Choose an amount, enter your email and continue to Paystack&apos;s
            hosted checkout.
          </p>
        </div>
      </section>
      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.grid2}>
            <div className={styles.card}>
              <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>Make a donation</div>
              <h2 style={{ fontSize: 36 }}>Choose your support.</h2>
              {fundraiser && (
                <p style={{ fontWeight: 700 }}>
                  Supporting: {fundraiserTitle || fundraiser}. This gift is credited to that campaign only when Paystack
                  confirms it.
                </p>
              )}
              <p>Select an amount. You can change it before continuing.</p>
              <div className={styles.amounts}>
                {amounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={amount === value}
                    className={amount === value ? `${styles.amount} ${styles.amountSelected}` : styles.amount}
                    onClick={() => setAmount(value)}
                  >
                    ₦{value.toLocaleString()}
                  </button>
                ))}
              </div>
              <form className={styles.form} onSubmit={pay}>
                <label className={styles.label}>
                  Full name
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </label>
                <label className={styles.label}>
                  Email address
                  <input
                    className={styles.input}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                {error && <div role="alert" className={styles.note}>{error}</div>}
                <button className={styles.primary} disabled={loading}>
                  {loading ? "Connecting to Paystack…" : `Donate ₦${amount.toLocaleString()}`} <ArrowRight size={16} />
                </button>
              </form>
              <div className={styles.note} style={{ marginTop: 18 }}>
                <ShieldCheck size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
                Your card or bank details are entered on Paystack&apos;s secure checkout, not stored by this page.
              </div>
            </div>
            <div>
              <div className={styles.card}>
                <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>Give with confidence</div>
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 44, lineHeight: 1.04 }}>
                  Payment should be simple. Reporting should be clear.
                </h2>
                <p>
                  Successful payments will be verified server-side before they can be counted as donations. Refi will use
                  the payment reference to reconcile gifts.
                </p>
                <Link className={styles.cardAction} href="/impact">See our impact approach <ArrowRight size={16} /></Link>
              </div>
              <div className={styles.card} style={{ marginTop: 18 }}>
                <HeartHandshake size={26} />
                <h3>Prefer to start by playing?</h3>
                <p>Try the Refi Challenge first, then decide whether you&apos;d like to support the Foundation.</p>
                <Link className={styles.primary} href="/play">Play for Impact <ArrowRight size={16} /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
