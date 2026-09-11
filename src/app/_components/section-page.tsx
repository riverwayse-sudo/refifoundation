import Link from "next/link";

type SectionPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  points: string[];
  cta?: string;
};

export function SectionPage({ eyebrow, title, intro, points, cta = "Get involved" }: SectionPageProps) {
  return (
    <main className="refi-page-shell">
      <section className="refi-page-hero">
        <div className="refi-page-hero-inner">
          <p className="refi-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="refi-page-intro">{intro}</p>
        </div>
      </section>
      <section className="refi-page-content">
        <div className="refi-page-grid">
          {points.map((point, index) => (
            <article className="refi-page-point" key={point}>
              <span>0{index + 1}</span>
              <p>{point}</p>
            </article>
          ))}
        </div>
        <Link className="refi-button refi-button-primary" href="/get-involved">
          {cta}
        </Link>
      </section>
    </main>
  );
}
