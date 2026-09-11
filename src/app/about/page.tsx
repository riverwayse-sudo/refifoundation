import { EditorialPage } from "../_components/editorial-page";
import { refiImages } from "@/lib/media";

export default function AboutPage() {
  return (
    <EditorialPage
      eyebrow="About REFI Foundation"
      title="Rooted in community. Focused on possibility."
      intro="REFI Foundation exists to turn care into practical opportunity for children, young people and communities across Africa."
      image={refiImages.hero}
      imagePosition="center 35%"
      stories={[
        { number: "01", title: "Listen before we act.", text: "We start with people and context. Understanding a community helps us support what is useful, responsible and relevant rather than importing assumptions." },
        { number: "02", title: "Opportunity should be practical.", text: "Education, sport, community support and care become meaningful when people can participate, build confidence and access a clearer path forward." },
        { number: "03", title: "Trust requires accountability.", text: "As REFI grows, we intend to make our programmes, partnerships, progress and lessons visible so supporters can understand what their support makes possible." },
        { number: "04", title: "Dignity is not optional.", text: "Children, families and communities are not campaign props. We will tell stories with consent, context and respect for the people represented." },
      ]}
      secondaryImage={refiImages.girls}
      secondaryTitle="A foundation for opportunity, not dependency."
      secondaryText="Our ambition is to support people and local systems in ways that strengthen capability over time. That means backing participation, learning, wellbeing and community-led progress."
      ctaLabel="Support the Foundation"
      ctaHref="/donate"
    />
  );
}
