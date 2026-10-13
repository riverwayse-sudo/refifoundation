'use client';

import { useEffect, useState } from "react";
import type { LiveMatch } from "@/lib/football/types";

type Feed = { configured: boolean; matches: LiveMatch[]; updatedAt?: string; message?: string };

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

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/matches/live", { cache: "no-store" });
        const result = await response.json() as Feed;
        if (!active) return;
        setFeed(result);
        setLastUpdated(result.updatedAt || new Date().toISOString());
      } catch {
        if (active) setFeed({ configured: false, matches: [], message: "We could not refresh the match feed. Please try again shortly." });
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <section className="refi-match-centre">
      <div className="refi-match-centre-head"><div><p className="refi-eyebrow refi-blue-label">Football centre</p><h2 className="refi-serif">Live match updates</h2><p>Scores refresh automatically while you follow the action.</p></div><div className="refi-match-refresh"><span className={feed.matches.length ? "refi-match-pulse" : "refi-match-pulse is-idle"} />Auto-refresh · 60 sec</div></div>
      {loading ? <p className="refi-match-notice" role="status">Checking live fixtures…</p> :
        !feed.configured ? <div className="refi-match-notice"><strong>Live scores are being connected.</strong><p>{feed.message || "The match feed will appear here once the data provider is configured."}</p></div> :
        feed.matches.length === 0 ? <div className="refi-match-notice"><strong>No live matches at the moment.</strong><p>Check back during scheduled fixtures. Scores are refreshed automatically.</p></div> :
        <div className="refi-match-grid">{feed.matches.map((match) => <MatchCard key={match.fixtureId} match={match} />)}</div>}
      {lastUpdated && <p className="refi-match-updated">Last checked {new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(lastUpdated))} WAT</p>}
    </section>
  );
}
