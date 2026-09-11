import { SectionPage } from "../_components/section-page";

export default function StoriesPage() {
  return (
    <SectionPage
      eyebrow="Stories"
      title="People are the reason the work matters."
      intro="REFI stories will document the people, places and moments behind the Foundation's programmes, with context and consent at the centre."
      points={[
        "Community stories will foreground lived experience rather than turning people into campaign props.",
        "Education stories will highlight learning, confidence and opportunity as they develop over time.",
        "Youth and sport stories will show participation, discipline, teamwork and the spaces young people create together.",
        "Every published story will be developed with care, accuracy and respect for the people represented.",
      ]}
      cta="Get involved"
    />
  );
}
