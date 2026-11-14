import { notFound } from "next/navigation";
import { CmsPage } from "../../_components/cms-page";
import { getPublishedPage, getPublishedPages } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const pages = await getPublishedPages();
  return pages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  return {
    title: page?.seoTitle || page?.title || "Page",
    description: page?.seoDescription || page?.summary || "REFI Foundation information.",
  };
}

export default async function CmsContentPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();
  return <CmsPage page={page} />;
}
