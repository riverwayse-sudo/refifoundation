'use client';

import { useEffect, useRef, useState } from "react";
import type { LiveMatch } from "@/lib/football/types";

type Feed = { configured: boolean; matches: LiveMatch[]; updatedAt?: string; message?: string; budgetExhausted?: boolean };

// Polling only re-reads a cached feed, so the interval does not add provider
// requests. 90 seconds keeps the display fresh without hammering the route.
const POLL_MS = 90_000;

// Defined outside the component so an effect never calls a state-setting
// closure synchronously; state is only touched once the request resolves.
function requestFeed(signal: AbortSignal): Promise<Feed> {
  return fetch("/api/matches/live", { cache: "no-store", signal }).then((response) => response.json() as Promise<Feed>);
}

function Team({ name, logo }: { name: string; logo: string | null }) {
  return <div className="refi-match-team">{logo ? <img src={logo} alt="" width={30} height={30} loading="lazy" /> : <span className="refi-match-crest" aria-hidden="true">{name.slice(0, 1)}</span>}<span>{name}</span></div>;
}

function MatchCard({ match }: { match: LiveMatch }) {
  const isLive = match.status === "LIVE" || match.status === "HT" || match.status === "INT";
  return (
    <article className="refi-match-card">
      <div className="refi-match-meta"><span>{match.competition}{match.country ? ` · ${match.country}` : ""}</span><span className={isLive ? "refi-match-status is-live" : "refi-match-status"}>{isLive && <i aria-hidden="true" />}{match.status === "LIVE" && match.elapsedMinutes !== null ? `${match.elapsedMinutes}'` : match.status === "HT" ? "Half-time" : match.status === "FT" ? "Full-time" : match.statusLabel}</span></div>
      <div className="refi-match-scoreline"><Team name={match.home.name} logo={match.home.logo} /><strong>{match.homeScore ?? "–"} <span>:</span> {match.awayScore ?? "–"}</strong><Team name={match.away.name} logo={match.away.logo} /></div>
    </article>
  );
}

export default function LiveMatchCentre() {
  const [feed, setFeed] = useState<Feed>({ configured: false, matches: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // One effect owns fetching, so the initial load and every poll share the same
  // cancellation path. The request is aborted on cleanup, which also covers the
  // pause toggle.
  useEffect(() => {
    if (paused) return;
    const controller = new AbortController();

    const load = () => {
      requestFeed(controller.signal)
        .then((result) => {
          if (controller.signal.aborted || !mounted.current) return;
          setFeed(result);
          setLastUpdated(result.updatedAt || new Date().toISOString());
        })
        .catch(() => {
          if (controller.signal.aborted || !mounted.current) return;
          setFeed({ configured: false, matches: [], message: "We could not refresh the match feed. Please try again shortly." });
        })
        .finally(() => {
          if (!controller.signal.aborted && mounted.current) setLoading(false);
        });
    };

    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [paused, reloadKey]);

  return (
    <section className="refi-match-centre">
      <div className="refi-match-centre-head">
        <div>
          <p className="refi-eyebrow refi-blue-label">Football centre</p>
          <h2 className="refi-serif">Live match updates</h2>
          <p>Premier League, UEFA Champions League and Nigerian league fixtures.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="refi-match-refresh"><span className={feed.matches.length ? "refi-match-pulse" : "refi-match-pulse is-idle"} />{paused ? "Paused" : "Auto-refresh · 90 sec"}</div>
          <button type="button" className="refi-match-refresh" onClick={() => setPaused((current) => !current)} aria-pressed={paused}>{paused ? "Resume" : "Pause"}</button>
          <button type="button" className="refi-match-refresh" onClick={() => setReloadKey((key) => key + 1)}>Refresh now</button>
        </div>
      </div>
      {loading ? <p className="refi-match-notice" role="status">Checking live fixtures…</p> :
        !feed.configured ? <div className="refi-match-notice"><strong>Live scores are being connected.</strong><p>{feed.message || "The match feed will appear here once the data provider is configured."}</p></div> :
        feed.budgetExhausted ? <div className="refi-match-notice"><strong>Today&apos;s live-score limit has been reached.</strong><p>{feed.message}</p></div> :
        feed.matches.length === 0 ? <div className="refi-match-notice"><strong>No live matches at the moment.</strong><p>Check back during scheduled fixtures. Scores are refreshed automatically.</p></div> :
        <div className="refi-match-grid">{feed.matches.map((match) => <MatchCard key={match.fixtureId} match={match} />)}</div>}
      {lastUpdated && <p className="refi-match-updated">Last checked {new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(lastUpdated))} WAT</p>}
    </section>
  );
}
