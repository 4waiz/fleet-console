import { RobotDetailClient } from "@/components/app/robot-detail-client";

interface PageProps {
  params: { id: string };
}

export default function RobotDetailPage({ params }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Robot Detail</h1>
        <p className="text-sm text-muted-foreground">
          Command panel, timeline, and queue state for one robot.
        </p>
      </div>
      <RobotDetailClient robotId={decodeURIComponent(params.id)} />
    </div>
  );
}
