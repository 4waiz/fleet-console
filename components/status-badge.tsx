import { Badge } from "@/components/ui/badge";
import type { CommandResult, RobotStatus, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function subtleClass(intent: "default" | "accent" | "muted" | "dark") {
  if (intent === "accent") {
    return "border-accent/35 bg-accent/15 text-accent-foreground";
  }
  if (intent === "dark") {
    return "border-primary/20 bg-primary text-primary-foreground";
  }
  if (intent === "muted") {
    return "border-border bg-muted/75 text-muted-foreground";
  }
  return "border-border bg-card/75 text-foreground";
}

export function RobotStatusBadge({ status }: { status: RobotStatus }) {
  const intent =
    status === "error"
      ? "dark"
      : status === "working" || status === "charging"
        ? "accent"
        : status === "paused"
          ? "muted"
          : "default";

  return (
    <Badge variant="outline" className={cn("font-medium", subtleClass(intent))}>
      {status}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const intent =
    status === "cancelled"
      ? "muted"
      : status === "in_progress" || status === "assigned"
        ? "accent"
        : status === "completed"
          ? "default"
          : "muted";

  return (
    <Badge variant="outline" className={cn("font-medium", subtleClass(intent))}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export function CommandResultBadge({ result }: { result: CommandResult }) {
  const intent = result.status === "success" ? "default" : "accent";
  return (
    <Badge variant="outline" className={cn("font-medium", subtleClass(intent))}>
      {result.status}
    </Badge>
  );
}
