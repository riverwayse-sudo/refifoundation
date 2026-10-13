import Link from "next/link";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import { getPublishedEvents } from "@/lib/sanity/client";

export const metadata = { title: "Events", description: "Upcoming community, education and sport events from REFI Foundation." };

export default async function EventsPage() {
  const events = await getPublishedEvents();
  return <main className="refi-page-shell"><SiteHeader /><section className="refi-editorial-hero refi-events-hero"><div className="refi-container refi-editorial-hero-content"><p className="refi-eyebrow refi-blue-label">Come together</p><h1 className="refi-serif">Events that create room for connection.</h1><p>Find upcoming REFI Foundation activities, community gatherings and programme events.</p></div></section><section className="refi-cms-stories"><div className="refi-container">{events.length ? <div className="refi-cms-story-grid">{events.map((event) => <article className="refi-cms-story-card" key={event._id}>{event.coverImageUrl && <img src={event.coverImageUrl} alt="" loading="lazy" />}<div className="refi-cms-story-card-body"><span>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(event.startsAt))}{event.location ? " · " + event.location : ""}</span><h2>{event.title}</h2>{event.summary && <p>{event.summary}</p>}{event.registrationUrl ? <a href={event.registrationUrl} target="_blank" rel="noreferrer">Register or learn more <span aria-hidden="true">→</span></a> : <p>Further details will be shared by REFI Foundation.</p>}</div></article>)}</div> : <div className="refi-match-notice"><strong>No upcoming events have been published yet.</strong><p>Check back soon for community activities, programme updates and opportunities to take part.</p><Link href="/get-involved">Find another way to get involved →</Link></div>}</div></section><SiteFooter /></main>;
}
