import { SectionPage } from "../_components/section-page";

export default function AboutPage() {
  return (
    <SectionPage
      eyebrow="About REFI Foundation"
      title="Rooted in community. Focused on possibility."
      intro="REFI Foundation exists to turn care into practical opportunity for children, young people and communities across Africa."
      points={[
        "We listen to communities before designing programmes, so support responds to real needs rather than assumptions.",
        "We focus on education, community support and sport as practical pathways to confidence, capability and opportunity.",
        "We are building an organisation that reports honestly on what it does, what changes and where more work is needed.",
      ]}
      cta="Work with REFI"
    />
  );
}
