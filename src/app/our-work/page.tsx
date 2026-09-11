import { SectionPage } from "../_components/section-page";

export default function OurWorkPage() {
  return (
    <SectionPage
      eyebrow="Our work"
      title="Investing in people, not just projects."
      intro="REFI programmes are designed around practical pathways to learning, belonging, wellbeing and a stronger future."
      points={[
        "Education & opportunity: helping children and young people access learning, confidence and pathways forward.",
        "Community development: supporting locally relevant initiatives that strengthen people, relationships and resilience.",
        "Sport & youth: using sport to create spaces for participation, discipline, teamwork and wellbeing.",
        "Children & vulnerable families: exploring responsible, dignity-first support for children and communities facing difficult circumstances.",
      ]}
      cta="Support the work"
    />
  );
}
