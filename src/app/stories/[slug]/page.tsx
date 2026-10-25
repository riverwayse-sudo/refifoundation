import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../_components/site-chrome";
import { Markdown } from "../../_components/markdown";
import { getPublishedStories, getPublishedStory } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

// Story pages are generated from the content committed to the repository, so a
// new story appears after the CMS commit triggers a rebuild. Any slug that is
// not in that set is genuinely absent, so return 404 rather than rendering on
// demand.
export const dynamicParams = false;

export async function generateStaticParams() {
  const stories = await getPublishedStories();
  return stories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  return {
    title: story?.title ?? "Story",
    description: story?.excerpt ?? "Stories and updates from REFI Foundation.",
  };
}

export default async function StoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  if (!story) notFound();

  return (
    <main className="refi-page-shell">
      <SiteHeader />
      <article className="refi-story-detail">
        <header className="refi-story-detail-head">
          <p className="refi-eyebrow refi-blue-label">{story.category || "REFI story"}</p>
          <h1 className="refi-serif">{story.title}</h1>
          {story.excerpt && <p>{story.excerpt}</p>}
          {story.publishedAt && (
            <time dateTime={story.publishedAt}>
              {new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(new Date(story.publishedAt))}
            </time>
          )}
        </header>
        {story.coverImageUrl && (
          <div className="refi-story-detail-image">
            <img src={story.coverImageUrl} alt="" />
          </div>
        )}
        <Markdown content={story.body} className="refi-story-detail-body" />
      </article>
      <SiteFooter />
    </main>
  );
}
