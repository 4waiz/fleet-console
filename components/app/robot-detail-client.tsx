"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  Route,
  Square,
  Workflow,
} from "lucide-react";
import { Mono } from "@/components/mono";
import { CommandResultBadge, RobotStatusBadge, TaskStatusBadge } from "@/components/status-badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { AuditEvent, Command, QueueSnapshot, RobotWithRaw, Task } from "@/lib/types";

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

function eventIcon(action: string) {
  if (action.includes("pause") || action.includes("cancel")) {
    return AlertCircle;
  }
  if (action.includes("resume") || action.includes("assign") || action.includes("reroute")) {
    return Workflow;
  }
  return CheckCircle2;
}

export function RobotDetailClient({ robotId }: Props) {
  const router = useRouter();
  const { role } = useRole();
  const prefersReducedMotion = useReducedMotion();

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
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!detail || !robot) {
    return <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm">{error ?? "Robot detail unavailable."}</div>;
  }

  const currentTask = robot.currentTaskId ? taskMap.get(robot.currentTaskId) : undefined;

  return (
    <div className="space-y-6">
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card>
          <CardContent className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Mono className="text-base font-semibold sm:text-lg">{robot.id}</Mono>
                <Badge variant="outline">{robot.vendor}</Badge>
                <RobotStatusBadge status={robot.status} />
                <Badge variant="secondary">{Math.round(robot.battery)}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Zone <span className="font-medium text-foreground">{robot.zone}</span> | Position (
                {robot.position.x.toFixed(1)}, {robot.position.y.toFixed(1)}) | Last seen{" "}
                {new Date(robot.lastSeen).toLocaleTimeString()}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="surface-soft p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current task</p>
                  <Mono className="mt-1">{robot.currentTaskId ?? "-"}</Mono>
                </div>
                <div className="surface-soft p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Queued tasks</p>
                  <p className="mt-1 text-lg font-semibold">{robot.taskQueue.length}</p>
                </div>
                <div className="surface-soft p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Role</p>
                  <p className="mt-1 text-lg font-semibold capitalize">{role}</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-2 lg:w-72">
              <Button
                className="w-full justify-start"
                variant="secondary"
                onClick={() => void handlePause()}
                disabled={roleReadOnly || robot.status === "paused"}
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button
                className="w-full justify-start"
                variant="secondary"
                onClick={() => void handleResume()}
                disabled={roleReadOnly || robot.status !== "paused"}
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>

              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline" disabled={roleReadOnly}>
                    <Workflow className="h-4 w-4" />
                    Assign Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Task</DialogTitle>
                    <DialogDescription>
                      Create and assign a task directly to <Mono className="inline">{robot.id}</Mono>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="taskType">Task Type</Label>
                      <Input
                        id="taskType"
                        value={assignForm.type}
                        onChange={(event) => setAssignForm((prev) => ({ ...prev, type: event.target.value }))}
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
                          onChange={(event) => setAssignForm((prev) => ({ ...prev, priority: event.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="taskZone">Destination Zone</Label>
                        <Input
                          id="taskZone"
                          value={assignForm.destinationZone}
                          onChange={(event) => setAssignForm((prev) => ({ ...prev, destinationZone: event.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="taskNotes">Notes</Label>
                      <Textarea
                        id="taskNotes"
                        value={assignForm.notes}
                        onChange={(event) => setAssignForm((prev) => ({ ...prev, notes: event.target.value }))}
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
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    disabled={roleReadOnly || ownedTaskIds.length === 0}
                  >
                    <Route className="h-4 w-4" />
                    Reroute
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reroute Task</DialogTitle>
                    <DialogDescription>Move a task from this robot to another robot queue.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label>Task</Label>
                      <Select value={rerouteForm.taskId} onValueChange={(value) => setRerouteForm((prev) => ({ ...prev, taskId: value }))}>
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
                        onValueChange={(value) => setRerouteForm((prev) => ({ ...prev, targetRobotId: value }))}
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
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    disabled={roleReadOnly || ownedTaskIds.length === 0}
                  >
                    <Square className="h-4 w-4" />
                    Cancel Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Task</DialogTitle>
                    <DialogDescription>Cancel one queued or active task for this robot.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label>Task</Label>
                      <Select value={cancelForm.taskId} onValueChange={(value) => setCancelForm((prev) => ({ ...prev, taskId: value }))}>
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
                        onChange={(event) => setCancelForm((prev) => ({ ...prev, reason: event.target.value }))}
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
                <p className="pt-1 text-xs text-muted-foreground">
                  Viewer role is read-only. Switch to operator/admin to enable actions.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current Task + Queue</CardTitle>
            <CardDescription>Active work and queued tasks assigned to this unit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="surface-soft p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current task</p>
              {currentTask ? (
                <div className="mt-3 space-y-2">
                  <Mono>{currentTask.id}</Mono>
                  <p className="text-sm">
                    {currentTask.type} | zone {currentTask.destinationZone} | priority {currentTask.priority}
                  </p>
                  <TaskStatusBadge status={currentTask.status} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No active task</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Queue ({robot.taskQueue.length})
              </p>
              {robot.taskQueue.length === 0 ? (
                <div className="surface-soft p-4 text-sm text-muted-foreground">Queue is empty.</div>
              ) : (
                robot.taskQueue.map((taskId) => {
                  const task = taskMap.get(taskId);
                  return (
                    <div key={taskId} className="surface-soft flex items-center justify-between px-4 py-3">
                      <Mono>{taskId}</Mono>
                      {task ? <TaskStatusBadge status={task.status} /> : <Badge variant="outline">Unknown</Badge>}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline (Last 20)</CardTitle>
            <CardDescription>State changes and command events for this robot.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[520px] overflow-auto">
            {auditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="relative ml-2 border-l border-border pl-6">
                {auditEvents.map((event) => {
                  const Icon = eventIcon(event.action);
                  return (
                    <li key={event.id} className="relative pb-5 last:pb-0">
                      <span className="absolute -left-[31px] top-0 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {new Date(event.ts).toLocaleString()}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{event.action}</Badge>
                          <CommandResultBadge result={event.result} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          actor={event.actorRole} vendor={event.vendor} task={event.taskId ?? "-"} reason=
                          {event.result.reason ?? "-"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Last Commands</CardTitle>
          <CardDescription>Recent command outcomes and linked task IDs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-3xl border border-border">
            <Table>
              <TableHeader className="bg-muted/55">
                <TableRow className="hover:translate-y-0 hover:bg-muted/55 hover:shadow-none">
                  <TableHead>time</TableHead>
                  <TableHead>type</TableHead>
                  <TableHead>result</TableHead>
                  <TableHead>task_id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.recentCommands.map((command) => (
                  <TableRow key={command.id} className="bg-card/55">
                    <TableCell>{new Date(command.createdAt).toLocaleTimeString()}</TableCell>
                    <TableCell>{command.type}</TableCell>
                    <TableCell>
                      <CommandResultBadge result={command.result} />
                    </TableCell>
                    <TableCell>
                      <Mono>{command.taskId ?? "-"}</Mono>
                    </TableCell>
                  </TableRow>
                ))}
                {detail.recentCommands.length === 0 ? (
                  <TableRow className="hover:translate-y-0 hover:bg-card hover:shadow-none">
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No commands recorded.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
