import { EditorialPage } from "../_components/editorial-page";
import { refiImages } from "@/lib/media";

export default function OurWorkPage() {
  return (
    <EditorialPage
      eyebrow="Our work"
      title="Investing in people, not just projects."
      intro="REFI programmes are designed around practical pathways to learning, belonging, wellbeing and a stronger future."
      image={refiImages.education}
      imagePosition="center 40%"
      stories={[
        { number: "01", title: "Education & opportunity", text: "We support learning environments and practical opportunities that help children and young people build confidence, capability and a sense of what is possible." },
        { number: "02", title: "Community development", text: "We back locally relevant initiatives that strengthen relationships, resilience and the people already creating value in their communities." },
        { number: "03", title: "Sport & youth", text: "Sport can create a powerful space for discipline, teamwork, belonging and healthy development. We support programmes that use it intentionally." },
        { number: "04", title: "Children & vulnerable families", text: "We are exploring responsible, dignity-first support for children and families facing difficult circumstances, with safeguarding and context at the centre." },
      ]}
      secondaryImage={refiImages.community}
      secondaryTitle="Local context shapes responsible action."
      secondaryText="Our work is not a catalogue of disconnected projects. Each programme should respond to a real need, have a clear purpose and give us something meaningful to learn and report."
      ctaLabel="Help fund the work"
      ctaHref="/donate"
    />
  );
}
