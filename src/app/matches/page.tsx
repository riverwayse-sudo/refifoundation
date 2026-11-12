import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import LiveMatchCentre from "./live-match-centre";

export const metadata = {
  title: "Live Football Matches",
  description: "Follow live football scores and match updates from REFI Foundation.",
};

export default function MatchesPage() {
  return (
    <main className="refi-page-shell refi-matches-page">
      <SiteHeader />
      <section className="refi-contact-hero">
        <div className="refi-container">
          <p className="refi-eyebrow">Sport · Community · Opportunity</p>
          <h1 className="refi-serif">The game brings us together.</h1>
          <p>Follow live football scores and match updates. REFI’s sports work is rooted in the belief that play can build confidence, belonging and opportunity.</p>
        </div>
      </section>
      <div className="refi-container refi-matches-content"><LiveMatchCentre /></div>
      <SiteFooter />
    </main>
  );
}
