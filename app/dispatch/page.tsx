import { DispatchClient } from "@/components/app/dispatch-client";

export default function DispatchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
        <p className="text-sm text-muted-foreground">
          Assign tasks, monitor queues, and route work across the fleet.
        </p>
      </div>
      <DispatchClient />
    </div>
  );
}
