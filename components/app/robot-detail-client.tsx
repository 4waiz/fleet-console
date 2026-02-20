"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pause, Play, Route, Square, Workflow } from "lucide-react";
import { RobotStatusBadge, TaskStatusBadge } from "@/components/app/status-badge";
import { useRole } from "@/components/providers/role-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AuditEvent,
  Command,
  QueueSnapshot,
  RobotWithRaw,
  Task,
} from "@/lib/types";

interface RobotDetailResponse {
  robot: RobotWithRaw;
  queueSummary: {
    queuedCount: number;
    hasCurrentTask: boolean;
    currentTaskId: string | null;
  };
  recentCommands: Command[];
}

interface AuditResponse {
  events: AuditEvent[];
}

interface TasksResponse {
  tasks: Task[];
  queues: QueueSnapshot[];
}

interface RobotsResponse {
  robots: RobotWithRaw[];
}

interface Props {
  robotId: string;
}

export function RobotDetailClient({ robotId }: Props) {
  const router = useRouter();
  const { role } = useRole();

  const [detail, setDetail] = useState<RobotDetailResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allRobots, setAllRobots] = useState<RobotWithRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [rerouteDialogOpen, setRerouteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [assignForm, setAssignForm] = useState({
    type: "pick",
    priority: "3",
    destinationZone: "zone_a",
    notes: "",
  });
  const [rerouteForm, setRerouteForm] = useState({ taskId: "", targetRobotId: "" });
  const [cancelForm, setCancelForm] = useState({ taskId: "", reason: "" });

  const fetchData = useCallback(async () => {
    try {
      const [robotRes, auditRes, tasksRes, robotsRes] = await Promise.all([
        fetch(`/api/robots/${encodeURIComponent(robotId)}`, { cache: "no-store" }),
        fetch(`/api/audit?robot_id=${encodeURIComponent(robotId)}&limit=20`, {
          cache: "no-store",
        }),
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/robots", { cache: "no-store" }),
      ]);

      if (!robotRes.ok) {
        if (robotRes.status === 404) {
          router.push("/");
          return;
        }
        throw new Error(`Failed robot load (${robotRes.status})`);
      }
      if (!auditRes.ok || !tasksRes.ok || !robotsRes.ok) {
        throw new Error("Failed to fetch one or more robot detail dependencies");
      }

      const [robotPayload, auditPayload, tasksPayload, robotsPayload] = (await Promise.all([
        robotRes.json(),
        auditRes.json(),
        tasksRes.json(),
        robotsRes.json(),
      ])) as [RobotDetailResponse, AuditResponse, TasksResponse, RobotsResponse];

      setDetail(robotPayload);
      setAuditEvents(auditPayload.events);
      setTasks(tasksPayload.tasks);
      setAllRobots(robotsPayload.robots);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load robot detail");
    } finally {
      setLoading(false);
    }
  }, [robotId, router]);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const roleReadOnly = role === "viewer";
  const robot = detail?.robot;
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const ownedTaskIds = useMemo(() => {
    if (!robot) {
      return [];
    }
    return [robot.currentTaskId, ...robot.taskQueue].filter((taskId): taskId is string => Boolean(taskId));
  }, [robot]);

  useEffect(() => {
    if (!rerouteForm.taskId && ownedTaskIds.length > 0) {
      setRerouteForm((prev) => ({ ...prev, taskId: ownedTaskIds[0] }));
    }
    if (!cancelForm.taskId && ownedTaskIds.length > 0) {
      setCancelForm((prev) => ({ ...prev, taskId: ownedTaskIds[0] }));
    }
  }, [cancelForm.taskId, ownedTaskIds, rerouteForm.taskId]);

  const runMutation = async (path: string, body: Record<string, unknown> = {}) => {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-role": role,
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      message?: string;
      error?: string;
      result?: { reason?: string };
    };
    if (!response.ok) {
      throw new Error(payload.message || payload.error || payload.result?.reason || `Request failed (${response.status})`);
    }
    toast.success(payload.message ?? "Command succeeded");
    await fetchData();
  };

  const handlePause = async () => {
    if (!robot) {
      return;
    }
    try {
      await runMutation(`/api/robots/${encodeURIComponent(robot.id)}/pause`, {
        reason: "paused from robot detail",
      });
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Pause failed");
    }
  };

  const handleResume = async () => {
    if (!robot) {
      return;
    }
    try {
      await runMutation(`/api/robots/${encodeURIComponent(robot.id)}/resume`);
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Resume failed");
    }
  };

  const handleAssign = async () => {
    if (!robot) {
      return;
    }
    try {
      await runMutation("/api/tasks/assign", {
        type: assignForm.type,
        priority: Number(assignForm.priority),
        destinationZone: assignForm.destinationZone,
        notes: assignForm.notes || undefined,
        assignedRobotId: robot.id,
      });
      setAssignDialogOpen(false);
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Assign failed");
    }
  };

  const handleReroute = async () => {
    if (!rerouteForm.taskId || !rerouteForm.targetRobotId) {
      toast.error("Select both task and target robot");
      return;
    }
    try {
      await runMutation(`/api/tasks/${encodeURIComponent(rerouteForm.taskId)}/reroute`, {
        targetRobotId: rerouteForm.targetRobotId,
      });
      setRerouteDialogOpen(false);
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Reroute failed");
    }
  };

  const handleCancel = async () => {
    if (!cancelForm.taskId) {
      toast.error("Choose a task to cancel");
      return;
    }
    try {
      await runMutation(`/api/tasks/${encodeURIComponent(cancelForm.taskId)}/cancel`, {
        reason: cancelForm.reason || undefined,
      });
      setCancelDialogOpen(false);
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Cancel failed");
    }
  };

  if (loading && !detail) {
    return <div className="text-sm text-muted-foreground">Loading robot detail...</div>;
  }

  if (!detail || !robot) {
    return <div className="text-sm text-destructive">{error ?? "Robot detail unavailable."}</div>;
  }

  const currentTask = robot.currentTaskId ? taskMap.get(robot.currentTaskId) : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="font-mono text-2xl">{robot.id}</CardTitle>
              <CardDescription>
                Vendor <span className="font-semibold">{robot.vendor}</span> in {robot.zone}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RobotStatusBadge status={robot.status} />
              <Badge variant="outline">{Math.round(robot.battery)}%</Badge>
              <Badge variant="secondary">Role: {role}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current Task + Queue</CardTitle>
            <CardDescription>
              Current task, queued tasks, and queue summary for this robot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Current Task</div>
              {currentTask ? (
                <div className="space-y-1">
                  <div className="font-mono text-sm">{currentTask.id}</div>
                  <div className="text-sm">
                    {currentTask.type} | zone {currentTask.destinationZone} | priority {currentTask.priority}
                  </div>
                  <TaskStatusBadge status={currentTask.status} />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No active task</div>
              )}
            </div>
            <div className="rounded-md border p-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Queue ({robot.taskQueue.length})
              </div>
              {robot.taskQueue.length === 0 ? (
                <div className="text-sm text-muted-foreground">Queue is empty</div>
              ) : (
                <ul className="space-y-2">
                  {robot.taskQueue.map((taskId) => {
                    const task = taskMap.get(taskId);
                    return (
                      <li key={taskId} className="flex items-center justify-between rounded border px-3 py-2">
                        <span className="font-mono text-xs">{taskId}</span>
                        {task ? <TaskStatusBadge status={task.status} /> : <Badge variant="outline">Unknown</Badge>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Mutating actions require operator/admin. Commands are audited.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full justify-start gap-2"
              variant="secondary"
              onClick={() => void handlePause()}
              disabled={roleReadOnly || robot.status === "paused"}
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="secondary"
              onClick={() => void handleResume()}
              disabled={roleReadOnly || robot.status !== "paused"}
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start gap-2" variant="outline" disabled={roleReadOnly}>
                  <Workflow className="h-4 w-4" />
                  Assign Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Task</DialogTitle>
                  <DialogDescription>
                    Create and assign a task directly to <span className="font-mono">{robot.id}</span>.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="taskType">Task Type</Label>
                    <Input
                      id="taskType"
                      value={assignForm.type}
                      onChange={(event) =>
                        setAssignForm((prev) => ({ ...prev, type: event.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="taskPriority">Priority (1-5)</Label>
                      <Input
                        id="taskPriority"
                        type="number"
                        min={1}
                        max={5}
                        value={assignForm.priority}
                        onChange={(event) =>
                          setAssignForm((prev) => ({ ...prev, priority: event.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="taskZone">Destination Zone</Label>
                      <Input
                        id="taskZone"
                        value={assignForm.destinationZone}
                        onChange={(event) =>
                          setAssignForm((prev) => ({
                            ...prev,
                            destinationZone: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taskNotes">Notes</Label>
                    <Textarea
                      id="taskNotes"
                      value={assignForm.notes}
                      onChange={(event) =>
                        setAssignForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => void handleAssign()}>Assign</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={rerouteDialogOpen} onOpenChange={setRerouteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start gap-2" variant="outline" disabled={roleReadOnly}>
                  <Route className="h-4 w-4" />
                  Reroute
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reroute Task</DialogTitle>
                  <DialogDescription>
                    Move a task from this robot to another robot queue.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Task</Label>
                    <Select
                      value={rerouteForm.taskId}
                      onValueChange={(value) =>
                        setRerouteForm((prev) => ({ ...prev, taskId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {ownedTaskIds.map((taskId) => (
                          <SelectItem key={taskId} value={taskId}>
                            {taskId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Target Robot</Label>
                    <Select
                      value={rerouteForm.targetRobotId}
                      onValueChange={(value) =>
                        setRerouteForm((prev) => ({ ...prev, targetRobotId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target robot" />
                      </SelectTrigger>
                      <SelectContent>
                        {allRobots
                          .filter((candidate) => candidate.id !== robot.id)
                          .map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.id} ({candidate.status})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => void handleReroute()}>Reroute</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start gap-2" variant="outline" disabled={roleReadOnly}>
                  <Square className="h-4 w-4" />
                  Cancel Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Task</DialogTitle>
                  <DialogDescription>
                    Cancel one queued or active task for this robot.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Task</Label>
                    <Select
                      value={cancelForm.taskId}
                      onValueChange={(value) =>
                        setCancelForm((prev) => ({ ...prev, taskId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {ownedTaskIds.map((taskId) => (
                          <SelectItem key={taskId} value={taskId}>
                            {taskId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Reason</Label>
                    <Textarea
                      value={cancelForm.reason}
                      onChange={(event) =>
                        setCancelForm((prev) => ({ ...prev, reason: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="destructive" onClick={() => void handleCancel()}>
                    Cancel Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {roleReadOnly ? (
              <div className="rounded border border-dashed p-2 text-xs text-muted-foreground">
                Viewer role is read-only. Switch to operator/admin to run commands.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timeline (Last 20)</CardTitle>
            <CardDescription>Status changes and command events from audit.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto">
            <ul className="space-y-2">
              {auditEvents.map((event) => (
                <li key={event.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span>{new Date(event.ts).toLocaleString()}</span>
                    <Badge variant="outline">{event.action}</Badge>
                    <Badge variant={event.result.status === "success" ? "secondary" : "destructive"}>
                      {event.result.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    actor={event.actorRole} vendor={event.vendor} task={event.taskId ?? "-"} reason=
                    {event.result.reason ?? "-"}
                  </div>
                </li>
              ))}
              {auditEvents.length === 0 ? (
                <li className="text-sm text-muted-foreground">No events yet.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Commands</CardTitle>
            <CardDescription>Most recent command outcomes for this robot.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>time</TableHead>
                  <TableHead>type</TableHead>
                  <TableHead>result</TableHead>
                  <TableHead>task_id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.recentCommands.map((command) => (
                  <TableRow key={command.id}>
                    <TableCell>{new Date(command.createdAt).toLocaleTimeString()}</TableCell>
                    <TableCell>{command.type}</TableCell>
                    <TableCell>
                      <Badge variant={command.result.status === "success" ? "secondary" : "destructive"}>
                        {command.result.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{command.taskId ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {detail.recentCommands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No commands recorded.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
