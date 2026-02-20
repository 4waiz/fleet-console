import { DispatchClient } from "@/components/app/dispatch-client";
import { Section } from "@/components/section";

export default function DispatchPage() {
  return (
    <Section
      title={
        <>
          Dispatch with <span className="accent-word">confidence</span>
        </>
      }
      description="Create assignments, route work to the right robot, and monitor queue behavior in real time."
    >
      <DispatchClient />
    </Section>
  );
}
