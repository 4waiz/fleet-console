"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TaskStatusBadge } from "@/components/app/status-badge";
import { useRole } from "@/components/providers/role-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [queues, setQueues] = useState<QueueSnapshot[]>([]);
  const [robots, setRobots] = useState<RobotWithRaw[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const queueLookup = useMemo(() => new Map(queues.map((entry) => [entry.robotId, entry])), [queues]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Dispatch</CardTitle>
          <CardDescription>Create and dispatch tasks to the fleet control layer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="task-type">Task Type</Label>
              <Input
                id="task-type"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Input
                  id="task-priority"
                  type="number"
                  min={1}
                  max={5}
                  value={form.priority}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, priority: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-zone">Destination Zone</Label>
                <Input
                  id="task-zone"
                  value={form.destinationZone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, destinationZone: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Assign Robot</Label>
              <Select
                value={form.assignedRobotId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, assignedRobotId: value }))}
              >
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-notes">Notes</Label>
              <Textarea
                id="task-notes"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => void submitTask()} disabled={submitting}>
                {submitting ? "Submitting..." : "Dispatch Task"}
              </Button>
              <Badge variant={role === "viewer" ? "outline" : "secondary"}>Role: {role}</Badge>
            </div>
            {role === "viewer" ? (
              <p className="text-xs text-muted-foreground">
                Viewer role is read-only. Use operator/admin role to submit tasks.
              </p>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <Card className="border-dashed bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Queue Snapshot</CardTitle>
              <CardDescription>Per-robot queue view from canonical state.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[360px] space-y-2 overflow-auto pt-0">
              {queues.map((queue) => (
                <div key={queue.robotId} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{queue.robotId}</span>
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

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks Table</CardTitle>
              <CardDescription>Status and assignment of dispatch tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>id</TableHead>
                    <TableHead>type</TableHead>
                    <TableHead>priority</TableHead>
                    <TableHead>destination</TableHead>
                    <TableHead>status</TableHead>
                    <TableHead>assigned_robot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-xs">{task.id}</TableCell>
                      <TableCell>{task.type}</TableCell>
                      <TableCell>{task.priority}</TableCell>
                      <TableCell>{task.destinationZone}</TableCell>
                      <TableCell>
                        <TaskStatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{task.assignedRobotId ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {tasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No tasks created yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queues">
          <Card>
            <CardHeader>
              <CardTitle>Queue By Robot</CardTitle>
              <CardDescription>Canonical queue and active task per robot.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
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
                      <TableRow key={robot.id}>
                        <TableCell className="font-mono text-xs">{robot.id}</TableCell>
                        <TableCell>{snapshot?.status ?? "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{snapshot?.currentTaskId ?? "-"}</TableCell>
                        <TableCell>{snapshot?.queue.length ?? 0}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {snapshot?.queue.join(", ") || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
