import { ApiDocsClient } from "@/components/app/api-docs-client";
import { Section } from "@/components/section";

export default function ApiDocsPage() {
  return (
    <Section
      title={
        <>
          API contracts built for <span className="accent-word">clarity</span>
        </>
      }
      description="Normalized endpoints, schema references, and ready-to-copy cURL examples that match the live dashboard workflows."
    >
      <ApiDocsClient />
    </Section>
  );
}
