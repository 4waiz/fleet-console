"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Mono } from "@/components/mono";
import { TaskStatusBadge } from "@/components/status-badge";
import { useRole } from "@/components/providers/role-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { QueueSnapshot, RobotWithRaw, Task } from "@/lib/types";

interface TasksResponse {
  tasks: Task[];
  queues: QueueSnapshot[];
}

interface RobotsResponse {
  robots: RobotWithRaw[];
}

export function DispatchClient() {
  const { role } = useRole();
  const prefersReducedMotion = useReducedMotion();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [queues, setQueues] = useState<QueueSnapshot[]>([]);
  const [robots, setRobots] = useState<RobotWithRaw[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | Task["status"]>("all");
  const [taskRobotFilter, setTaskRobotFilter] = useState("all");
  const [form, setForm] = useState({
    type: "pick",
    priority: "3",
    destinationZone: "zone_a",
    notes: "",
    assignedRobotId: "auto",
  });

  const loadData = useCallback(async () => {
    try {
      const [tasksRes, robotsRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/robots", { cache: "no-store" }),
      ]);
      if (!tasksRes.ok || !robotsRes.ok) {
        throw new Error("Failed to fetch dispatch data");
      }
      const [tasksPayload, robotsPayload] = (await Promise.all([tasksRes.json(), robotsRes.json()])) as [
        TasksResponse,
        RobotsResponse,
      ];
      setTasks(tasksPayload.tasks);
      setQueues(tasksPayload.queues);
      setRobots(robotsPayload.robots);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to fetch dispatch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const queueLookup = useMemo(() => new Map(queues.map((entry) => [entry.robotId, entry])), [queues]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) {
        return false;
      }
      if (taskRobotFilter !== "all" && task.assignedRobotId !== taskRobotFilter) {
        return false;
      }
      return true;
    });
  }, [taskRobotFilter, taskStatusFilter, tasks]);

  const submitTask = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/tasks/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-role": role,
        },
        body: JSON.stringify({
          type: form.type,
          priority: Number(form.priority),
          destinationZone: form.destinationZone,
          notes: form.notes || undefined,
          assignedRobotId: form.assignedRobotId === "auto" ? undefined : form.assignedRobotId,
        }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.message || payload.error || `Assign failed (${response.status})`);
      }
      toast.success(payload.message ?? "Task assigned");
      setForm((prev) => ({ ...prev, notes: "" }));
      await loadData();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Task assign failed");
    } finally {
      setSubmitting(false);
    }
  };

  const roleReadOnly = role === "viewer";

  return (
    <div className="space-y-6">
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Task Dispatch Studio</CardTitle>
                <CardDescription>
                  Grouped fields for reliable assignment and queue-aware operator flow.
                </CardDescription>
              </div>
              <Badge variant={roleReadOnly ? "outline" : "secondary"}>Role: {role}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="task-type">Task Type</Label>
                <Input
                  id="task-type"
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Short operation label such as pick, dropoff, or tow.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="task-priority">Priority</Label>
                  <Input
                    id="task-priority"
                    type="number"
                    min={1}
                    max={5}
                    value={form.priority}
                    onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">1 is low urgency, 5 is highest urgency.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-zone">Destination Zone</Label>
                  <Input
                    id="task-zone"
                    value={form.destinationZone}
                    onChange={(event) => setForm((prev) => ({ ...prev, destinationZone: event.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Zone routing is used in auto robot selection.</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Assign Robot</Label>
                <Select value={form.assignedRobotId} onValueChange={(value) => setForm((prev) => ({ ...prev, assignedRobotId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign robot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-select by dispatcher</SelectItem>
                    {robots.map((robot) => (
                      <SelectItem key={robot.id} value={robot.id}>
                        {robot.id} ({robot.zone} | {robot.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto mode prioritizes availability, zone affinity, and battery levels.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="task-notes">Operator Notes</Label>
                <Textarea
                  id="task-notes"
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => void submitTask()} disabled={submitting || roleReadOnly}>
                  {submitting ? "Dispatching..." : "Dispatch Task"}
                </Button>
                {roleReadOnly ? (
                  <p className="text-xs text-muted-foreground">
                    Viewer role is read-only. Switch to operator/admin to dispatch.
                  </p>
                ) : null}
              </div>
              {error ? <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm">{error}</div> : null}
            </div>

            <Card className="surface-soft border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Queue Snapshot</CardTitle>
                <CardDescription>Per-robot queue state from canonical dispatch view.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[450px] space-y-2 overflow-auto pt-0">
                {loading && queues.length === 0
                  ? Array.from({ length: 6 }, (_, index) => <Skeleton key={`queue-skeleton-${index}`} className="h-16 w-full" />)
                  : queues.map((queue) => (
                      <div key={queue.robotId} className="surface-soft px-3 py-2">
                        <div className="flex items-center justify-between">
                          <Mono>{queue.robotId}</Mono>
                          <Badge variant="outline">{queue.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          current={queue.currentTaskId ?? "-"} queue={queue.queue.length}
                        </p>
                      </div>
                    ))}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </motion.section>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Task Table</CardTitle>
                <CardDescription>Status-aware assignment list with quick filters.</CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={taskStatusFilter} onValueChange={(value) => setTaskStatusFilter(value as typeof taskStatusFilter)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: all</SelectItem>
                    <SelectItem value="queued">queued</SelectItem>
                    <SelectItem value="assigned">assigned</SelectItem>
                    <SelectItem value="in_progress">in_progress</SelectItem>
                    <SelectItem value="completed">completed</SelectItem>
                    <SelectItem value="cancelled">cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={taskRobotFilter} onValueChange={setTaskRobotFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Robot filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Robot: all</SelectItem>
                    {robots.map((robot) => (
                      <SelectItem key={robot.id} value={robot.id}>
                        {robot.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading && tasks.length === 0 ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-border">
                  <Table>
                    <TableHeader className="bg-muted/55">
                      <TableRow className="hover:translate-y-0 hover:bg-muted/55 hover:shadow-none">
                        <TableHead>id</TableHead>
                        <TableHead>type</TableHead>
                        <TableHead>priority</TableHead>
                        <TableHead>destination</TableHead>
                        <TableHead>status</TableHead>
                        <TableHead>assigned_robot</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => (
                        <TableRow key={task.id} className="bg-card/55">
                          <TableCell>
                            <Mono>{task.id}</Mono>
                          </TableCell>
                          <TableCell>{task.type}</TableCell>
                          <TableCell>{task.priority}</TableCell>
                          <TableCell>{task.destinationZone}</TableCell>
                          <TableCell>
                            <TaskStatusBadge status={task.status} />
                          </TableCell>
                          <TableCell>
                            <Mono>{task.assignedRobotId ?? "-"}</Mono>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredTasks.length === 0 ? (
                        <TableRow className="hover:translate-y-0 hover:bg-card hover:shadow-none">
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No tasks for current filters.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queues">
          <Card>
            <CardHeader>
              <CardTitle>Queue By Robot</CardTitle>
              <CardDescription>Active task and pending queue list per robot.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-3xl border border-border">
                <Table>
                  <TableHeader className="bg-muted/55">
                    <TableRow className="hover:translate-y-0 hover:bg-muted/55 hover:shadow-none">
                      <TableHead>robot_id</TableHead>
                      <TableHead>status</TableHead>
                      <TableHead>current_task</TableHead>
                      <TableHead>queue_count</TableHead>
                      <TableHead>queued_tasks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {robots.map((robot) => {
                      const snapshot = queueLookup.get(robot.id);
                      return (
                        <TableRow key={robot.id} className="bg-card/55">
                          <TableCell>
                            <Mono>{robot.id}</Mono>
                          </TableCell>
                          <TableCell>{snapshot?.status ?? "-"}</TableCell>
                          <TableCell>
                            <Mono>{snapshot?.currentTaskId ?? "-"}</Mono>
                          </TableCell>
                          <TableCell>{snapshot?.queue.length ?? 0}</TableCell>
                          <TableCell>
                            <Mono>{snapshot?.queue.join(", ") || "-"}</Mono>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
