"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../../_components/site-chrome";
import { GAMES } from "@/lib/games/catalog";
import styles from "../../engagement.module.css";

/**
 * Creates a campaign.
 *
 * The form sends the fields a campaign needs and nothing else. The server
 * validates every value again, builds the address, and returns the campaign
 * page. The goal is entered in naira and converted to kobo once, here, so the
 * stored value is unambiguous.
 */
export default function StartFundraiserPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [organiserName, setOrganiserName] = useState("");
  const [story, setStory] = useState("");
  const [game, setGame] = useState("");
  const [goalNaira, setGoalNaira] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A completed game can send visitors here with its slug. Read the query only
  // after hydration, then preselect the matching game without trusting arbitrary
  // query values.
  useEffect(() => {
    const requestedGame = new URLSearchParams(window.location.search).get("game");
    if (!requestedGame || !GAMES.some((item) => item.slug === requestedGame)) return;

    // Defer the hydration-time URL handoff to the next task. This avoids a
    // synchronous state update inside the effect while keeping query values
    // restricted to published game slugs.
    const timeoutId = window.setTimeout(() => setGame(requestedGame), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const targetMinor = goalNaira.trim() === "" ? null : Math.round(Number(goalNaira) * 100);
      const response = await fetch("/api/fundraisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          organiserName,
          story: story.trim() === "" ? null : story,
          game: game === "" ? null : game,
          targetMinor,
        }),
      });
      const body = await response.json() as { ok?: boolean; url?: string; error?: string; errors?: string[] };
      if (!response.ok || !body.ok || !body.url) {
        setError(body.error || body.errors?.[0] || "The campaign could not be created.");
        setBusy(false);
        return;
      }
      router.push(body.url);
    } catch {
      setError("The campaign could not be created. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>REFI · New campaign</div>
          <h1>Start a fundraiser.</h1>
          <p>Give your challenge a page to share. Only payments that Paystack confirms count toward the total.</p>
        </div>
      </section>
      <section className={styles.body}>
        <div className={styles.container} style={{ maxWidth: 720 }}>
          <form className={styles.card} onSubmit={submit} noValidate>
            <div className={styles.eyebrow} style={{ color: "var(--refi-blue-700)" }}>Campaign details</div>
            <label className={styles.label} htmlFor="campaign-title">
              Campaign title
              <input
                id="campaign-title"
                className={styles.input}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                minLength={3}
                required
                placeholder="Run 10 kilometres for the Refi library fund"
              />
            </label>
            <label className={styles.label} htmlFor="campaign-organiser">
              Your display name
              <input
                id="campaign-organiser"
                className={styles.input}
                value={organiserName}
                onChange={(event) => setOrganiserName(event.target.value)}
                maxLength={40}
                required
                autoComplete="nickname"
                placeholder="Ada O."
              />
            </label>
            <label className={styles.label} htmlFor="campaign-goal">
              Goal in naira (optional)
              <input
                id="campaign-goal"
                className={styles.input}
                value={goalNaira}
                onChange={(event) => setGoalNaira(event.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="250000"
              />
            </label>
            <label className={styles.label} htmlFor="campaign-game">
              Game you are playing (optional)
              <select id="campaign-game" className={styles.input} value={game} onChange={(event) => setGame(event.target.value)}>
                <option value="">No game chosen</option>
                {GAMES.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.title}</option>
                ))}
              </select>
            </label>
            {game && (
              <p role="status" style={{ margin: 0, color: "var(--refi-ink-soft)" }}>
                This campaign is linked to your selected game: {GAMES.find((item) => item.slug === game)?.title}.
              </p>
            )}
            <label className={styles.label} htmlFor="campaign-story">
              Why this campaign (optional)
              <textarea
                id="campaign-story"
                className={styles.input}
                value={story}
                onChange={(event) => setStory(event.target.value)}
                maxLength={2000}
                rows={6}
                placeholder="Tell supporters what you are doing and why it matters."
              />
            </label>
            {error && <div role="alert" className={styles.note}>{error}</div>}
            <div className={styles.actions}>
              <button className={styles.primary} disabled={busy} type="submit">
                {busy ? "Creating…" : "Create campaign"} <ArrowRight size={16} aria-hidden="true" />
              </button>
              <Link className={styles.secondary} href="/fundraise">Cancel</Link>
            </div>
            <p style={{ marginTop: 16, color: "var(--refi-ink-soft)" }}>
              Do not include an email address or a link in your display name. Campaigns are public once created. Contact the
              Foundation if a campaign needs to be removed.
            </p>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
