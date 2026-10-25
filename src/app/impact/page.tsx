import { EditorialPage } from "../_components/editorial-page";
import { CmsPage } from "../_components/cms-page";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import { refiImages } from "@/lib/media";
import { getPublishedPage, getVerifiedImpactMetrics } from "@/lib/content";

export async function generateMetadata() {
  const page = await getPublishedPage("impact");
  return { title: page?.seoTitle || page?.title || "Impact & Accountability", description: page?.seoDescription || page?.summary || "Verified impact reporting and accountability from REFI Foundation." };
}

export default async function ImpactPage() {
  const [page, metrics] = await Promise.all([getPublishedPage("impact"), getVerifiedImpactMetrics()]);
  if (page) return <CmsPage page={page} />;
  if (!metrics.length) return <EditorialPage eyebrow="Impact & accountability" title="Show the work. Measure what changes." intro="REFI will build its impact story around evidence: programmes delivered, people reached, outcomes observed and lessons learned." image={refiImages.community} imagePosition="center 42%" stories={[
    { number: "01", title: "Measure what matters.", text: "We will prioritise useful measures of participation, delivery and outcomes instead of inflated headline numbers or vanity metrics." },
    { number: "02", title: "Put context beside the numbers.", text: "Programme reporting should explain what happened, where, when and for whom. Numbers are more useful when people can understand the conditions behind them." },
    { number: "03", title: "Let stories add the human picture.", text: "Data can show scale and progress. Carefully developed stories can show experience, change and the people behind the work." },
    { number: "04", title: "Report honestly as we grow.", text: "The Foundation will use this space for verified programme results, milestones, learning and areas where more work is needed." },
  ]} secondaryImage={refiImages.education} secondaryTitle="Accountability is part of the programme." secondaryText="We are deliberately avoiding invented impact claims while the Foundation establishes its programme record. As verified results become available, this page should become their public home." ctaLabel="Read our stories" ctaHref="/stories" />;
  return <main className="refi-page-shell"><SiteHeader /><section className="refi-editorial-hero"><div className="refi-editorial-hero-image"><img src={refiImages.community.src} alt={refiImages.community.alt} /><div className="refi-editorial-hero-overlay" /></div><div className="refi-container refi-editorial-hero-content"><p className="refi-eyebrow">Impact & accountability</p><h1 className="refi-serif">Show the work. Measure what changes.</h1><p>Verified programme results, milestones and reporting context from REFI Foundation.</p></div></section><section className="refi-cms-stories"><div className="refi-container"><div className="refi-impact-metric-grid">{metrics.map((metric) => <article className="refi-impact-metric-card" key={metric.id}><strong>{metric.value}</strong><h2>{metric.label}</h2>{metric.context && <p>{metric.context}</p>}</article>)}</div><p className="refi-impact-disclaimer">Only metrics marked as verified by REFI editors are displayed here.</p></div></section><SiteFooter /></main>;
}
