import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="refi-nav">
      <div className="refi-container refi-nav-inner">
        <Link className="refi-brand" href="/" aria-label="REFI Foundation home"><span className="refi-mark">R</span><span>REFI FOUNDATION</span></Link>
        <nav className="refi-nav-links" aria-label="Primary navigation">
          <Link href="/about">About</Link>
          <Link href="/our-work">Our Work</Link>
          <Link href="/impact">Impact</Link>
          <Link href="/stories">Stories</Link>
          <Link href="/get-involved">Get Involved</Link>
          <Link className="refi-support" href="/donate">Donate</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="refi-footer">
      <div className="refi-container refi-footer-grid">
        <div><div className="refi-brand"><span className="refi-mark">R</span><span>REFI FOUNDATION</span></div><p>A community-focused foundation working to expand opportunity and strengthen lives through practical action.</p></div>
        <div><h4>Explore</h4><p><Link href="/about">About</Link><br /><Link href="/our-work">Our Work</Link><br /><Link href="/impact">Impact</Link><br /><Link href="/stories">Stories</Link></p></div>
        <div><h4>Act</h4><p><Link href="/get-involved">Get involved</Link><br /><Link href="/donate">Donate</Link><br /><a href="mailto:hello@refifoundation.org">Email the Foundation</a></p></div>
      </div>
      <div className="refi-container refi-footer-bottom">© 2026 REFI Foundation. Built around people, opportunity and measurable action.</div>
    </footer>
  );
}
