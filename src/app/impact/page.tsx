import { SectionPage } from "../_components/section-page";

export default function ImpactPage() {
  return (
    <SectionPage
      eyebrow="Impact & accountability"
      title="Show the work. Measure what changes."
      intro="REFI will build its impact story around evidence: programmes delivered, people reached, outcomes observed and lessons learned."
      points={[
        "We will publish meaningful measures rather than inflated headline numbers or vanity metrics.",
        "Programme reporting will connect activities to outcomes, with dates, locations and context wherever appropriate.",
        "Stories will complement the data by showing the human experience behind the work.",
        "As the Foundation grows, this page will become the public home for verified programme results and reporting.",
      ]}
      cta="Read our stories"
    />
  );
}
