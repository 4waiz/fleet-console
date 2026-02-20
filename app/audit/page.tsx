import { AuditClient } from "@/components/app/audit-client";
import { Section } from "@/components/section";

export default function AuditPage() {
  return (
    <Section
      title={
        <>
          Immutable records, <span className="accent-word">clear</span> accountability
        </>
      }
      description="Review command trails and state transitions with filters designed for operational incident review."
    >
      <AuditClient />
    </Section>
  );
}
