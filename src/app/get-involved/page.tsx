import Link from "next/link";

export default function GetInvolvedPage() {
  return (
    <main className="refi-page-shell">
      <section className="refi-page-hero">
        <div className="refi-page-hero-inner">
          <p className="refi-eyebrow">Get involved</p>
          <h1>There is more than one way to help build what comes next.</h1>
          <p className="refi-page-intro">
            Support REFI through funding, partnership, volunteering, expertise or by helping connect the Foundation to communities and opportunities that matter.
          </p>
        </div>
      </section>
      <section className="refi-page-content">
        <div className="refi-page-grid">
          {[
            ["01", "Support", "Help fund practical programmes and the people needed to deliver them responsibly."],
            ["02", "Partner", "Bring expertise, resources, networks or institutional support to a programme or community need."],
            ["03", "Volunteer", "Contribute time and skills where they can create genuine value."],
            ["04", "Sponsor", "Explore support for youth, sport, education and community initiatives."],
          ].map(([number, title, text]) => (
            <article className="refi-page-point" key={number}>
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <Link className="refi-button refi-button-primary" href="mailto:hello@refifoundation.org">
          Start a conversation
        </Link>
      </section>
    </main>
  );
}
