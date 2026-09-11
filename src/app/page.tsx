import Image from "next/image";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { refiImages } from "@/lib/media";

const work = [
  {
    number: "01",
    title: "Education & opportunity",
    text: "Creating practical pathways for children and young people to learn, grow and participate fully in their communities.",
  },
  {
    number: "02",
    title: "Community support",
    text: "Supporting initiatives that strengthen families, local communities and the people already doing meaningful work on the ground.",
  },
  {
    number: "03",
    title: "Sport & wellbeing",
    text: "Using sport, play and shared experiences to build confidence, belonging, discipline and healthier futures.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="refi-nav">
        <div className="refi-container refi-nav-inner">
          <a className="refi-brand" href="#top" aria-label="REFI Foundation home">
            <span className="refi-mark">R</span>
            <span>REFI FOUNDATION</span>
          </a>
          <nav className="refi-nav-links" aria-label="Primary navigation">
            <a href="#about">About</a>
            <a href="#work">Our Work</a>
            <a href="#impact">Impact</a>
            <a href="#stories">Stories</a>
            <a href="#get-involved">Get Involved</a>
            <a className="refi-support" href="#get-involved">Support us</a>
          </nav>
        </div>
      </header>

      <section id="top" className="refi-hero">
        <div className="refi-hero-media">
          <Image src={refiImages.hero.src} alt={refiImages.hero.alt} fill priority sizes="100vw" />
          <div className="refi-hero-overlay" />
        </div>
        <div className="refi-container refi-hero-content">
          <div className="refi-eyebrow">Rooted in community · Focused on possibility</div>
          <h1 className="refi-serif">Every child deserves a chance to thrive.</h1>
          <p>
            REFI Foundation supports practical opportunities that help children, young people and communities build stronger futures across Africa.
          </p>
          <div className="refi-actions">
            <a className="refi-button refi-button-primary" href="#get-involved">Support the Foundation <ArrowRight size={16} /></a>
            <a className="refi-button refi-button-secondary" href="#work">Explore our work</a>
          </div>
        </div>
      </section>

      <section id="about" className="refi-intro">
        <div className="refi-container refi-intro-grid">
          <div>
            <div className="refi-eyebrow" style={{ color: "var(--refi-blue-700)" }}>Why REFI</div>
            <h2 className="refi-serif">Good intentions need practical action.</h2>
            <div className="refi-rule" />
          </div>
          <div>
            <p className="refi-lead">
              We believe lasting impact starts by listening to people, understanding what is already working and investing in opportunities that can make a real difference.
            </p>
            <p className="refi-lead" style={{ fontSize: 16, marginTop: 24 }}>
              From education and community initiatives to sport and support for vulnerable children, our work is designed around dignity, participation and measurable progress.
            </p>
          </div>
        </div>
      </section>

      <section id="work" className="refi-section refi-section-blue">
        <div className="refi-container">
          <div className="refi-section-head">
            <div>
              <div className="refi-eyebrow">What we do</div>
              <h2 className="refi-serif">Investing in people, not just projects.</h2>
            </div>
            <p>Our programmes are built around practical needs and the long-term strength of the communities they serve.</p>
          </div>
          <div className="refi-work-grid">
            {work.map((item) => (
              <article className="refi-work-card" key={item.number}>
                <span className="refi-work-number">{item.number}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <ArrowRight size={20} aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="impact" className="refi-section">
        <div className="refi-container refi-impact">
          <div className="refi-impact-image">
            <Image src={refiImages.education.src} alt={refiImages.education.alt} fill sizes="(max-width: 800px) 100vw, 50vw" />
          </div>
          <div>
            <div className="refi-eyebrow" style={{ color: "var(--refi-blue-700)" }}>Impact with evidence</div>
            <h2 className="refi-serif">Show the work. Measure what changes.</h2>
            <p className="refi-lead" style={{ fontSize: 17 }}>
              The foundation will make its programmes, milestones and outcomes visible — because trust grows when people can see what support makes possible.
            </p>
            <div className="refi-stat-grid">
              <div className="refi-stat"><strong>01</strong><span>Community-first programme design</span></div>
              <div className="refi-stat"><strong>03</strong><span>Core areas of intervention</span></div>
              <div className="refi-stat"><strong>100%</strong><span>Commitment to transparent reporting</span></div>
              <div className="refi-stat"><strong>∞</strong><span>Potential unlocked through opportunity</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="stories" className="refi-section" style={{ paddingTop: 30 }}>
        <div className="refi-container">
          <div className="refi-section-head">
            <div>
              <div className="refi-eyebrow" style={{ color: "var(--refi-blue-700)" }}>Stories</div>
              <h2 className="refi-serif">People are the point.</h2>
            </div>
            <p>We will use this space to document the people, communities and moments behind the work.</p>
          </div>
          <div className="refi-stories-grid">
            <article className="refi-story">
              <Image src={refiImages.girls.src} alt={refiImages.girls.alt} fill sizes="(max-width: 800px) 100vw, 65vw" />
              <div className="refi-story-content"><span>Education</span><h3>When opportunity reaches the classroom, possibility becomes visible.</h3></div>
            </article>
            <article className="refi-story">
              <Image src={refiImages.community.src} alt={refiImages.community.alt} fill sizes="(max-width: 800px) 100vw, 35vw" />
              <div className="refi-story-content"><span>Community</span><h3>Stronger futures are built together.</h3></div>
            </article>
          </div>
        </div>
      </section>

      <section id="get-involved" className="refi-cta">
        <div className="refi-container refi-cta-inner">
          <div>
            <div className="refi-eyebrow" style={{ color: "var(--refi-red-700)" }}>Get involved</div>
            <h2 className="refi-serif">There is more than one way to help build what comes next.</h2>
          </div>
          <a className="refi-button refi-button-primary" href="mailto:hello@refifoundation.org"><HeartHandshake size={17} /> Start a conversation</a>
        </div>
      </section>

      <footer className="refi-footer">
        <div className="refi-container refi-footer-grid">
          <div>
            <div className="refi-brand"><span className="refi-mark">R</span><span>REFI FOUNDATION</span></div>
            <p>A community-focused foundation working to expand opportunity and strengthen lives through practical action.</p>
          </div>
          <div><h4>Explore</h4><p><a href="#about">About</a><br /><a href="#work">Our Work</a><br /><a href="#impact">Impact</a><br /><a href="#stories">Stories</a></p></div>
          <div><h4>Connect</h4><p><a href="#get-involved">Get involved</a><br /><a href="mailto:hello@refifoundation.org">Email the Foundation</a></p></div>
        </div>
        <div className="refi-container refi-footer-bottom">© 2026 REFI Foundation. Built around people, opportunity and measurable action.</div>
      </footer>
    </main>
  );
}
