import { Badge } from "@/components/ui/badge";
import type { RobotStatus, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RobotStatusBadge({ status }: { status: RobotStatus }) {
  const className =
    status === "error"
      ? "bg-red-100 text-red-700 border-red-200"
      : status === "working"
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : status === "charging"
          ? "bg-amber-100 text-amber-700 border-amber-200"
          : status === "paused"
            ? "bg-slate-200 text-slate-700 border-slate-300"
            : "bg-emerald-100 text-emerald-700 border-emerald-200";
  return (
    <Badge variant="outline" className={cn("font-medium uppercase tracking-wide", className)}>
      {status}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const className =
    status === "cancelled"
      ? "bg-slate-200 text-slate-700 border-slate-300"
      : status === "completed"
        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
        : status === "in_progress"
          ? "bg-blue-100 text-blue-700 border-blue-200"
          : status === "assigned"
            ? "bg-sky-100 text-sky-700 border-sky-200"
            : "bg-amber-100 text-amber-700 border-amber-200";
  return (
    <Badge variant="outline" className={cn("font-medium uppercase tracking-wide", className)}>
      {status.replace("_", " ")}
    </Badge>
  );
}
