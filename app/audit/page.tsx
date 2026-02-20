import { AuditClient } from "@/components/app/audit-client";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Role-scoped command and state-change events. UI does not allow deletion.
        </p>
      </div>
      <AuditClient />
    </div>
  );
}
