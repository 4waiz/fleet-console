import { FleetOverviewClient } from "@/components/app/fleet-overview-client";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fleet Overview</h1>
        <p className="text-sm text-muted-foreground">
          Unified AMR control layer with normalized state across mixed vendors.
        </p>
      </div>
      <FleetOverviewClient />
    </div>
  );
}
