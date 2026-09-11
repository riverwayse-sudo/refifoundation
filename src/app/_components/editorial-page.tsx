import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { refiImages } from "@/lib/media";
import { SiteFooter, SiteHeader } from "./site-chrome";

type Story = { number: string; title: string; text: string };

type EditorialPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  image: { src: string; alt: string };
  imagePosition?: string;
  stories: Story[];
  secondaryImage?: { src: string; alt: string };
  secondaryTitle: string;
  secondaryText: string;
  ctaLabel: string;
  ctaHref: string;
};

export function EditorialPage({ eyebrow, title, intro, image, imagePosition = "center", stories, secondaryImage = refiImages.community, secondaryTitle, secondaryText, ctaLabel, ctaHref }: EditorialPageProps) {
  return (
    <main className="refi-page-shell">
      <SiteHeader />
      <section className="refi-editorial-hero">
        <div className="refi-editorial-hero-image"><Image src={image.src} alt={image.alt} fill priority sizes="100vw" style={{ objectPosition: imagePosition }} /><div className="refi-editorial-hero-overlay" /></div>
        <div className="refi-container refi-editorial-hero-content"><p className="refi-eyebrow">{eyebrow}</p><h1 className="refi-serif">{title}</h1><p>{intro}</p></div>
      </section>
      <section className="refi-editorial-points refi-reveal"><div className="refi-container"><div className="refi-editorial-point-grid">{stories.map((story) => <article key={story.number} className="refi-editorial-point"><span>{story.number}</span><h2>{story.title}</h2><p>{story.text}</p></article>)}</div></div></section>
      <section className="refi-editorial-feature refi-reveal"><div className="refi-container refi-editorial-feature-grid"><div className="refi-editorial-feature-image"><Image src={secondaryImage.src} alt={secondaryImage.alt} fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div><p className="refi-eyebrow refi-blue-label">Built around people</p><h2 className="refi-serif">{secondaryTitle}</h2><p className="refi-lead refi-lead-small">{secondaryText}</p><Link className="refi-button refi-button-primary" href={ctaHref}>{ctaLabel} <ArrowRight size={16} /></Link></div></div></section>
      <SiteFooter />
    </main>
  );
}
