import { EditorialPage } from "../_components/editorial-page";
import { refiImages } from "@/lib/media";

export default function ImpactPage() {
  return (
    <EditorialPage
      eyebrow="Impact & accountability"
      title="Show the work. Measure what changes."
      intro="REFI will build its impact story around evidence: programmes delivered, people reached, outcomes observed and lessons learned."
      image={refiImages.community}
      imagePosition="center 42%"
      stories={[
        { number: "01", title: "Measure what matters.", text: "We will prioritise useful measures of participation, delivery and outcomes instead of inflated headline numbers or vanity metrics." },
        { number: "02", title: "Put context beside the numbers.", text: "Programme reporting should explain what happened, where, when and for whom. Numbers are more useful when people can understand the conditions behind them." },
        { number: "03", title: "Let stories add the human picture.", text: "Data can show scale and progress. Carefully developed stories can show experience, change and the people behind the work." },
        { number: "04", title: "Report honestly as we grow.", text: "The Foundation will use this space for verified programme results, milestones, learning and areas where more work is needed." },
      ]}
      secondaryImage={refiImages.education}
      secondaryTitle="Accountability is part of the programme."
      secondaryText="We are deliberately avoiding invented impact claims while the Foundation establishes its programme record. As verified results become available, this page should become their public home."
      ctaLabel="Read our stories"
      ctaHref="/stories"
    />
  );
}
