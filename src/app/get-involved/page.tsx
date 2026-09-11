import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { refiImages } from "@/lib/media";

const ways = [
  ["01", "Support", "Help fund practical programmes and the people needed to deliver them responsibly."],
  ["02", "Partner", "Bring expertise, resources, networks or institutional support to a programme or community need."],
  ["03", "Volunteer", "Contribute time and skills where they can create genuine value."],
  ["04", "Sponsor", "Explore support for youth, sport, education and community initiatives."],
];

export default function GetInvolvedPage() {
  return (
    <main className="refi-page-shell">
      <section className="refi-editorial-hero">
        <div className="refi-editorial-hero-image"><Image src={refiImages.hero.src} alt={refiImages.hero.alt} fill priority sizes="100vw" /><div className="refi-editorial-hero-overlay" /></div>
        <div className="refi-container refi-editorial-hero-content">
          <p className="refi-eyebrow">Get involved</p>
          <h1 className="refi-serif">There is more than one way to help build what comes next.</h1>
          <p>Support REFI through funding, partnership, volunteering, expertise or by helping connect the Foundation to communities and opportunities that matter.</p>
        </div>
      </section>
      <section className="refi-page-content refi-reveal">
        <div className="refi-container">
          <div className="refi-editorial-point-grid">
            {ways.map(([number, title, text]) => <article className="refi-editorial-point" key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></article>)}
          </div>
          <div className="refi-involve-banner">
            <div><p className="refi-eyebrow refi-blue-label">Ready to help?</p><h2 className="refi-serif">Start with a conversation.</h2><p>Tell us what you would like to contribute and where your interest sits. We can explore the right next step together.</p></div>
            <div className="refi-actions"><Link className="refi-button refi-button-primary" href="/donate">Donate <ArrowRight size={16} /></Link><a className="refi-button refi-button-secondary refi-button-dark" href="mailto:hello@refifoundation.org">Contact REFI</a></div>
          </div>
        </div>
      </section>
    </main>
  );
}
