import { RobotDetailClient } from "@/components/app/robot-detail-client";
import { Section } from "@/components/section";

interface PageProps {
  params: { id: string };
}

export default function RobotDetailPage({ params }: PageProps) {
  return (
    <Section
      title={
        <>
          Robot command and <span className="accent-word">timeline</span>
        </>
      }
      description="Inspect operational state, task context, and command outcomes for a single unit."
    >
      <RobotDetailClient robotId={decodeURIComponent(params.id)} />
    </Section>
  );
}
