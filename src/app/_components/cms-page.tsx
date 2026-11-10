import Image from "next/image";
import { PortableText } from "@portabletext/react";
import { SiteFooter, SiteHeader } from "./site-chrome";
import type { PublishedPage } from "@/lib/sanity/client";

export function CmsPage({ page }: { page: PublishedPage }) {
  return (
    <main className="refi-page-shell">
      <SiteHeader />
      <section className="refi-editorial-hero">
        <div className="refi-editorial-hero-image">
          {page.heroImageUrl ? <img src={page.heroImageUrl} alt="" /> : <div className="refi-cms-page-image-fallback" />}
          <div className="refi-editorial-hero-overlay" />
        </div>
        <div className="refi-container refi-editorial-hero-content">
          <p className="refi-eyebrow">REFI Foundation</p>
          <h1 className="refi-serif">{page.title}</h1>
          {page.summary && <p>{page.summary}</p>}
        </div>
      </section>
      <article className="refi-cms-page-body">
        <PortableText value={(page.body || []) as never} />
      </article>
      <SiteFooter />
    </main>
  );
}
