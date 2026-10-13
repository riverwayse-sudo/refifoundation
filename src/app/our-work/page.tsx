import Image from "next/image";
import Link from "next/link";
import { EditorialPage } from "../_components/editorial-page";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import { refiImages } from "@/lib/media";
import { getPublishedProjects } from "@/lib/sanity/client";

export const metadata = { title: "Our Work", description: "Explore REFI Foundation's projects and programmes." };

export default async function OurWorkPage() {
  const projects = await getPublishedProjects();
  if (!projects.length) return <EditorialPage eyebrow="Our work" title="Investing in people, not just projects." intro="REFI programmes are designed around practical pathways to learning, belonging, wellbeing and a stronger future." image={refiImages.education} imagePosition="center 40%" stories={[
    { number: "01", title: "Education & opportunity", text: "We support learning environments and practical opportunities that help children and young people build confidence, capability and a sense of what is possible." },
    { number: "02", title: "Community development", text: "We back locally relevant initiatives that strengthen relationships, resilience and the people already creating value in their communities." },
    { number: "03", title: "Sport & youth", text: "Sport can create a powerful space for discipline, teamwork, belonging and healthy development. We support programmes that use it intentionally." },
    { number: "04", title: "Children & vulnerable families", text: "We are exploring responsible, dignity-first support for children and families facing difficult circumstances, with safeguarding and context at the centre." },
  ]} secondaryImage={refiImages.community} secondaryTitle="Local context shapes responsible action." secondaryText="Our work is not a catalogue of disconnected projects. Each programme should respond to a real need, have a clear purpose and give us something meaningful to learn and report." ctaLabel="Help fund the work" ctaHref="/donate" />;
  return <main className="refi-page-shell"><SiteHeader /><section className="refi-editorial-hero"><div className="refi-editorial-hero-image"><Image src={refiImages.education.src} alt={refiImages.education.alt} fill priority sizes="100vw" /><div className="refi-editorial-hero-overlay" /></div><div className="refi-container refi-editorial-hero-content"><p className="refi-eyebrow">Our work</p><h1 className="refi-serif">Investing in people, not just projects.</h1><p>Explore the projects and programmes currently shared by REFI Foundation.</p></div></section><section className="refi-cms-stories"><div className="refi-container"><div className="refi-cms-story-grid">{projects.map((project) => <article className="refi-cms-story-card" key={project._id}>{project.coverImageUrl && <img src={project.coverImageUrl} alt="" loading="lazy" />}<div className="refi-cms-story-card-body"><span>{project.focusArea || "REFI programme"}{project.status ? " · " + project.status : ""}</span><h2>{project.title}</h2><p>{project.summary}</p><Link href={"/our-work#" + project.slug}>Programme overview <span aria-hidden="true">→</span></Link></div></article>)}</div></div></section><SiteFooter /></main>;
}
