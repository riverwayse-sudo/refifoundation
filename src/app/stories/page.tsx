import { EditorialPage } from "../_components/editorial-page";
import { refiImages } from "@/lib/media";

export default function StoriesPage() {
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
        { number: "03", title: "Youth & sport", text: "Participation, discipline, teamwork and belonging can be powerful stories of development when the young people involved are represented with care." },
        { number: "04", title: "Consent & accuracy", text: "Published stories will be developed with permission, appropriate safeguarding and a commitment to representing people and places truthfully." },
      ]}
      secondaryImage={refiImages.hero}
      secondaryTitle="The story behind the support matters."
      secondaryText="As REFI's work develops, this section will move from editorial foundation to a living archive of programme stories, community voices, milestones and lessons."
      ctaLabel="Get involved"
      ctaHref="/get-involved"
    />
  );
}
