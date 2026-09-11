import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Handshake, Heart, Medal, Users } from "lucide-react";
import { refiImages } from "@/lib/media";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import styles from "./marketing.module.css";

const opportunities = [
  {
    number: "01",
    title: "Sponsor a programme",
    text: "Put your organisation behind a clearly defined area of work, with room to agree the audience, geography and outcomes that matter most.",
    icon: Medal,
  },
  {
    number: "02",
    title: "Partner with REFI",
    text: "Bring expertise, resources, networks or institutional capacity to initiatives designed around real community needs.",
    icon: Handshake,
  },
  {
    number: "03",
    title: "Support a child or community",
    text: "Make a direct contribution to the practical opportunities that help children, young people and families move forward.",
    icon: Heart,
  },
  {
    number: "04",
    title: "Mobilise your network",
    text: "Help more people discover the work, share a campaign or connect REFI to organisations that can make a meaningful contribution.",
    icon: Users,
  },
];

const principles = [
  ["01", "People first", "We start with people and context, not a pre-packaged intervention."],
  ["02", "Practical action", "Support is directed towards opportunities that can be understood, delivered and improved."],
  ["03", "Visible accountability", "We are building our reporting around evidence, milestones and honest communication."],
];

export default function MarketingPage() {
  return (
    <main className={styles.page}>
      <SiteHeader />

      <section className={styles.hero}>
        <div className={styles.heroMedia}>
          <Image src={refiImages.hero.src} alt={refiImages.hero.alt} fill priority sizes="100vw" />
          <div className={styles.heroOverlay} />
        </div>
        <div className={`refi-container ${styles.heroContent}`}>
          <p className="refi-eyebrow">For partners, sponsors & supporters</p>
          <h1 className="refi-serif">Help turn opportunity into something people can experience.</h1>
          <p className={styles.heroLead}>
            REFI Foundation connects people, organisations and resources with practical work that helps children, young people and communities build stronger futures.
          </p>
          <div className="refi-actions">
            <Link className="refi-button refi-button-primary" href="/get-involved">Start a conversation <ArrowRight size={16} /></Link>
            <Link className="refi-button refi-button-secondary" href="/our-work">See where we work</Link>
          </div>
          <div className={styles.heroNote}>Africa · Community · Opportunity · Action</div>
        </div>
      </section>

      <section className={styles.positioning}>
        <div className="refi-container">
          <div className={styles.positioningGrid}>
            <div>
              <p className="refi-eyebrow refi-blue-label">Why support REFI</p>
              <h2 className="refi-serif">Good intentions become more powerful when they are organised around action.</h2>
            </div>
            <div>
              <p className="refi-lead">We are building a foundation that makes it easier for people who want to help to understand where their support can fit.</p>
              <p className={styles.bodyCopy}>That means starting with community realities, defining practical priorities and creating partnerships that can grow responsibly. We do not promise impact before the work exists; we commit to documenting what happens as it does.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.opportunities}>
        <div className="refi-container">
          <div className={styles.sectionIntro}>
            <div>
              <p className="refi-eyebrow">Ways to work with us</p>
              <h2 className="refi-serif">There is a role for every kind of support.</h2>
            </div>
            <p>Whether you bring funding, expertise, networks or time, the starting point is the same: understand the need, then build something useful around it.</p>
          </div>
          <div className={styles.opportunityGrid}>
            {opportunities.map(({ number, title, text, icon: Icon }) => (
              <article className={styles.opportunity} key={number}>
                <div className={styles.opportunityTop}><span>{number}</span><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link href="/get-involved" aria-label={`Learn about ${title.toLowerCase()}`}>Explore <ArrowRight size={15} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.feature}>
        <div className="refi-container">
          <div className={styles.featureGrid}>
            <div className={styles.featureImage}>
              <Image src={refiImages.education.src} alt={refiImages.education.alt} fill sizes="(max-width: 800px) 100vw, 52vw" />
            </div>
            <div className={styles.featureCopy}>
              <p className="refi-eyebrow refi-blue-label">What your support helps make possible</p>
              <h2 className="refi-serif">More than a donation. A practical contribution to possibility.</h2>
              <p className="refi-lead refi-lead-small">Education, community development, sport and support for vulnerable children are connected by one idea: opportunity works better when people have the support to act on it.</p>
              <div className={styles.featureList}>
                <span>Learning & opportunity</span>
                <span>Community strength</span>
                <span>Sport & wellbeing</span>
                <span>Support for vulnerable children</span>
              </div>
              <Link className="refi-button refi-button-secondary refi-button-dark" href="/our-work">Explore our programmes <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.principles}>
        <div className="refi-container">
          <div className={styles.principlesHeader}>
            <p className="refi-eyebrow refi-blue-label">The REFI standard</p>
            <h2 className="refi-serif">Support should be worthy of trust.</h2>
          </div>
          <div className={styles.principleGrid}>
            {principles.map(([number, title, text]) => (
              <article key={number} className={styles.principle}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.story}>
        <div className="refi-container">
          <div className={styles.storyGrid}>
            <div className={styles.storyCopy}>
              <p className="refi-eyebrow">See the people behind the work</p>
              <h2 className="refi-serif">The strongest case for support is work you can understand.</h2>
              <p>As REFI grows, this space will document programme stories, milestones and lessons from the communities at the centre of the work.</p>
              <Link className="refi-button refi-button-primary" href="/stories">Read REFI stories <ArrowRight size={16} /></Link>
            </div>
            <div className={styles.storyImage}>
              <Image src={refiImages.community.src} alt={refiImages.community.alt} fill sizes="(max-width: 800px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className="refi-container">
          <div className={styles.finalCtaInner}>
            <div>
              <p className="refi-eyebrow refi-red-label">Ready to contribute?</p>
              <h2 className="refi-serif">Let&apos;s find the right way to work together.</h2>
              <p>Tell us what you can bring. We can start with a conversation and build from there.</p>
            </div>
            <div className="refi-actions">
              <Link className="refi-button refi-button-primary" href="/get-involved">Get involved <ArrowRight size={16} /></Link>
              <Link className="refi-button refi-button-secondary refi-button-dark" href="/donate">Support REFI</Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
