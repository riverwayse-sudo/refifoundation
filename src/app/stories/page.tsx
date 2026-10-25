import Image from "next/image";
import Link from "next/link";
import { EditorialPage } from "../_components/editorial-page";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import { refiImages } from "@/lib/media";
import { getPublishedStories } from "@/lib/content";

export const metadata = {
  title: "Stories & news",
  description: "Stories, updates and community voices from REFI Foundation.",
};

export default async function StoriesPage() {
  const stories = await getPublishedStories();

  // Until the first story is published, keep the approved editorial layout
  // rather than showing an empty listing.
  if (!stories.length) {
    return (
      <EditorialPage
        eyebrow="Stories"
        title="People are the reason the work matters."
        intro="REFI stories will document the people, places and moments behind the Foundation's programmes, with context and consent at the centre."
        image={refiImages.girls}
        imagePosition="center 35%"
        stories={[
          { number: "01", title: "Education stories", text: "We will highlight learning, confidence and opportunity as they develop over time — not simply capture a single moment for a campaign." },
          { number: "02", title: "Community stories", text: "People and local context come first. Stories should help audiences understand the work without reducing communities to hardship narratives." },
          { number: "03", title: "Youth & sport", text: "Participation, discipline, teamwork and belonging can be powerful stories of development when young people are represented with care." },
          { number: "04", title: "Consent & accuracy", text: "Published stories will be developed with permission, appropriate safeguarding and a commitment to representing people and places truthfully." },
        ]}
        secondaryImage={refiImages.hero}
        secondaryTitle="The story behind the support matters."
        secondaryText="As REFI's work develops, this section will become a living archive of programme stories, community voices, milestones and lessons."
        ctaLabel="Get involved"
        ctaHref="/get-involved"
      />
    );
  }

  return (
    <main className="refi-page-shell">
      <SiteHeader />
      <section className="refi-editorial-hero">
        <div className="refi-editorial-hero-image">
          <Image src={refiImages.girls.src} alt={refiImages.girls.alt} fill priority sizes="100vw" />
          <div className="refi-editorial-hero-overlay" />
        </div>
        <div className="refi-container refi-editorial-hero-content">
          <p className="refi-eyebrow">Stories & news</p>
          <h1 className="refi-serif">People are the reason the work matters.</h1>
          <p>Stories, updates and community voices from REFI Foundation, published with context, consent and care.</p>
        </div>
      </section>
      <section className="refi-cms-stories">
        <div className="refi-container">
          <div className="refi-cms-story-grid">
            {stories.map((story) => (
              <article className="refi-cms-story-card" key={story.id}>
                {story.coverImageUrl && <img src={story.coverImageUrl} alt="" loading="lazy" />}
                <div className="refi-cms-story-card-body">
                  <span>
                    {story.category || "REFI story"}
                    {story.publishedAt
                      ? " · " + new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(story.publishedAt))
                      : ""}
                  </span>
                  <h2>{story.title}</h2>
                  {story.excerpt && <p>{story.excerpt}</p>}
                  <Link href={"/stories/" + story.slug}>
                    Read story <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
