import Image from "next/image";
import Link from "next/link";
import { MobileNavigation } from "./mobile-navigation";

// The supplied artwork is a tall stacked lockup (emblem above the wordmark), so
// rendering it whole inside the 84px navigation bar would shrink the wordmark to
// about 2px. The header therefore uses a direct crop of the artwork's emblem, and
// the footer carries the full lockup where there is room for it. Nothing is redrawn.
export function SiteHeader() {
  return (
    <header className="refi-nav">
      <div className="refi-container refi-nav-inner">
        <Link className="refi-brand" href="/" aria-label="REFI Foundation home">
          <Image
            className="refi-logo"
            src="/images/refi-foundation-emblem.png"
            alt="REFI Foundation"
            width={1013}
            height={1013}
            priority
          />
        </Link>
        <nav className="refi-nav-links" aria-label="Primary navigation">
          <Link href="/about">About</Link>
          <Link href="/our-work">Our Work</Link>
          <Link href="/impact">Impact</Link>
          <Link href="/events">Events</Link>
          <Link href="/stories">Stories</Link>
          <Link href="/get-involved">Get Involved</Link>
          <Link className="refi-support" href="/donate">Donate</Link>
        </nav>
        <MobileNavigation />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="refi-footer">
      <div className="refi-container refi-footer-grid">
        <div>
          <Image
            className="refi-footer-logo"
            src="/images/refi-foundation-logo.png"
            alt="REFI Foundation"
            width={988}
            height={1447}
          />
          <p className="refi-tagline">RAISING • EMPOWERING • TRANSFORMING LIVES.</p>
          <p>A community-focused foundation working to expand opportunity and strengthen lives through practical action.</p>
        </div>
        <div><h4>Explore</h4><p><Link href="/about">About</Link><br /><Link href="/our-work">Our Work</Link><br /><Link href="/impact">Impact</Link><br /><Link href="/stories">Stories</Link></p></div>
        <div><h4>Act</h4><p><Link href="/get-involved">Get involved</Link><br /><Link href="/donate">Donate</Link><br /><a href="mailto:hello@refifoundation.org">Email the Foundation</a></p></div>
      </div>
      <div className="refi-container refi-footer-bottom">© 2026 REFI Foundation. Built around people, opportunity and measurable action.</div>
    </footer>
  );
}
