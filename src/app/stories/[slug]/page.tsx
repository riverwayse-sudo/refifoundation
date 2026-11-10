import Image from "next/image";
import { PortableText } from "@portabletext/react";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../_components/site-chrome";
import { getPublishedStory } from "@/lib/sanity/client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  return { title: story?.title || "Story", description: story?.excerpt || "Stories and updates from REFI Foundation." };
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
          {story.publishedAt && <time dateTime={story.publishedAt}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(new Date(story.publishedAt))}</time>}
        </header>
        {story.coverImageUrl && <div className="refi-story-detail-image"><Image src={story.coverImageUrl} alt="" fill sizes="(max-width: 900px) 100vw, 900px" unoptimized /></div>}
        <div className="refi-story-detail-body"><PortableText value={(story.body || []) as never} /></div>
      </article>
      <SiteFooter />
    </main>
  );
}
