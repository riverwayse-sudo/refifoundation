import { SiteFooter, SiteHeader } from "./site-chrome";
import { Markdown } from "./markdown";
import type { PublishedPage } from "@/lib/content";

export function CmsPage({ page }: { page: PublishedPage }) {
  return (
    <main className="refi-page-shell">
      <SiteHeader />
      <section className="refi-editorial-hero">
        <div className="refi-editorial-hero-image">
          {/* Editor-supplied URLs can point at any host, which next/image
              would reject against the remote allowlist at build time. */}
          {page.heroImageUrl ? (
            <img src={page.heroImageUrl} alt="" fetchPriority="high" />
          ) : (
            <div className="refi-cms-page-image-fallback" />
          )}
          <div className="refi-editorial-hero-overlay" />
        </div>
        <div className="refi-container refi-editorial-hero-content">
          <p className="refi-eyebrow">REFI Foundation</p>
          <h1 className="refi-serif">{page.title}</h1>
          {page.summary && <p>{page.summary}</p>}
        </div>
      </section>
      <Markdown content={page.body} className="refi-cms-page-body" />
      <SiteFooter />
    </main>
  );
}
