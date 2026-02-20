import { FleetOverviewClient } from "@/components/app/fleet-overview-client";
import { Section } from "@/components/section";

export default function HomePage() {
  return (
    <Section
      title={
        <>
          Fleet orchestration for <span className="accent-word">serious</span> operations
        </>
      }
      description="Monitor mixed AMR fleets in one normalized control surface with live polling, role-based commanding, and auditable actions."
    >
      <FleetOverviewClient />
    </Section>
  );
}
