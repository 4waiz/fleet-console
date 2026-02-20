import {
  mapLocusPayloadToRobotState,
  mapRobotStateToLocusPayload,
  mapRobotStateToVendorBPayload,
  mapVendorBPayloadToRobotState,
} from "@/lib/adapters";
import { createSeedFleetData } from "@/lib/seed";
import { runSimulationTick } from "@/lib/simulator";
import { isUsingKv, readFleetData, writeFleetData } from "@/lib/store";
import type {
  AuditEvent,
  Command,
  CommandResult,
  FleetData,
  QueueSnapshot,
  RobotState,
  RobotWithRaw,
  Role,
  Task,
  Vendor,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

const TICK_INTERVAL_MS = 5_000;

export interface MutationOutcome<T = unknown> {
  ok: boolean;
  status: number;
  message: string;
  result: CommandResult;
  data?: T;
}

async function getOrCreateFleetData(): Promise<FleetData> {
  const existing = await readFleetData();
  if (existing) {
    return existing;
  }
  const seeded = createSeedFleetData();
  await writeFleetData(seeded);
  return seeded;
}

function tickIfNeeded(data: FleetData): void {
  const now = Date.now();
  if (now - data.lastTick >= TICK_INTERVAL_MS) {
    runSimulationTick(data, now);
  }
}

export async function withFleetData<T>(
  handler: (data: FleetData) => Promise<T> | T,
): Promise<T> {
  const data = await getOrCreateFleetData();
  tickIfNeeded(data);
  try {
    return await handler(data);
  } finally {
    await writeFleetData(data);
  }
}

function pushAudit(data: FleetData, event: AuditEvent): void {
  data.audit.push(event);
  if (data.audit.length > 2_000) {
    data.audit = data.audit.slice(-2_000);
  }
}

function pushCommand(data: FleetData, command: Command): void {
  data.commands.push(command);
  if (data.commands.length > 1_000) {
    data.commands = data.commands.slice(-1_000);
  }
}

export function listRobots(data: FleetData): RobotWithRaw[] {
  const fromLocus = Object.values(data.locusPayloads).map((raw) => ({
    ...mapLocusPayloadToRobotState(raw),
    rawPayload: raw,
  }));

  const fromVendorB = Object.values(data.vendorBPayloads).map((raw) => ({
    ...mapVendorBPayloadToRobotState(raw),
    rawPayload: raw,
  }));

  return [...fromLocus, ...fromVendorB].sort((a, b) => a.id.localeCompare(b.id));
}

export function findRobotById(data: FleetData, robotId: string): RobotWithRaw | undefined {
  const locusRaw = data.locusPayloads[robotId];
  if (locusRaw) {
    return { ...mapLocusPayloadToRobotState(locusRaw), rawPayload: locusRaw };
  }
  const vendorRaw = data.vendorBPayloads[robotId];
  if (vendorRaw) {
    return { ...mapVendorBPayloadToRobotState(vendorRaw), rawPayload: vendorRaw };
  }
  return undefined;
}

export function setRobotState(data: FleetData, robot: RobotState): void {
  if (robot.vendor === "locus") {
    data.locusPayloads[robot.id] = mapRobotStateToLocusPayload(robot);
    return;
  }
  data.vendorBPayloads[robot.id] = mapRobotStateToVendorBPayload(robot);
}

export function listTasks(data: FleetData): Task[] {
  return [...data.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAudit(
  data: FleetData,
  input: { robotId?: string; action?: string; result?: "success" | "fail"; limit?: number },
): AuditEvent[] {
  const filtered = data.audit
    .filter((event) => {
      if (input.robotId && event.robotId !== input.robotId) {
        return false;
      }
      if (input.action && event.action !== input.action) {
        return false;
      }
      if (input.result && event.result.status !== input.result) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.ts.localeCompare(a.ts));

  return filtered.slice(0, input.limit ?? 200);
}

export function recentCommandsForRobot(data: FleetData, robotId: string, limit = 10): Command[] {
  return data.commands
    .filter((command) => command.robotId === robotId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function queueSnapshots(data: FleetData): QueueSnapshot[] {
  return listRobots(data).map((robot) => ({
    robotId: robot.id,
    vendor: robot.vendor,
    status: robot.status,
    currentTaskId: robot.currentTaskId,
    queue: [...robot.taskQueue],
  }));
}

function getVendorForRobot(data: FleetData, robotId?: string): Vendor | "system" {
  if (!robotId) {
    return "system";
  }
  if (data.locusPayloads[robotId]) {
    return "locus";
  }
  if (data.vendorBPayloads[robotId]) {
    return "vendor_b";
  }
  return "system";
}

function addAuditForAction(
  data: FleetData,
  input: {
    role: Role;
    action: string;
    robotId?: string;
    taskId?: string;
    result: CommandResult;
    payload?: Record<string, unknown>;
  },
): void {
  pushAudit(data, {
    id: generateId("audit"),
    ts: new Date().toISOString(),
    actorRole: input.role,
    action: input.action,
    robotId: input.robotId,
    taskId: input.taskId,
    result: input.result,
    vendor: getVendorForRobot(data, input.robotId),
    payload: input.payload ?? {},
  });
}

function addCommandForAction(
  data: FleetData,
  input: {
    type: Command["type"];
    role: Role;
    robotId: string;
    taskId?: string;
    result: CommandResult;
  },
): void {
  pushCommand(data, {
    id: generateId("cmd"),
    type: input.type,
    robotId: input.robotId,
    taskId: input.taskId,
    issuedByRole: input.role,
    createdAt: new Date().toISOString(),
    result: input.result,
  });
}

function roleDenied(data: FleetData, role: Role, action: string, context: { robotId?: string; taskId?: string }) {
  const result: CommandResult = { status: "fail", reason: "viewer role is read-only" };
  addAuditForAction(data, {
    role,
    action,
    robotId: context.robotId,
    taskId: context.taskId,
    result,
    payload: { reason: result.reason },
  });
  if (context.robotId) {
    const actionType = action.includes("cancel")
      ? "cancel_task"
      : action.includes("reroute")
        ? "reroute"
        : action.includes("assign")
          ? "assign_task"
          : action.includes("resume")
            ? "resume"
            : "pause";
    addCommandForAction(data, {
      type: actionType,
      role,
      robotId: context.robotId,
      taskId: context.taskId,
      result,
    });
  }
  return {
    ok: false,
    status: 403,
    message: "Viewer role cannot execute mutating actions",
    result,
  } satisfies MutationOutcome;
}

function taskMap(data: FleetData): Map<string, Task> {
  return new Map(data.tasks.map((task) => [task.id, task]));
}

function nextTaskForRobot(data: FleetData, robot: RobotState): void {
  if (robot.currentTaskId) {
    return;
  }
  const nextTaskId = robot.taskQueue.shift() ?? null;
  if (!nextTaskId) {
    if (robot.status === "working") {
      robot.status = "idle";
    }
    return;
  }

  const map = taskMap(data);
  const nextTask = map.get(nextTaskId);
  robot.currentTaskId = nextTaskId;
  if (nextTask) {
    nextTask.status = "in_progress";
    nextTask.assignedRobotId = robot.id;
  }

  if (robot.status !== "paused" && robot.status !== "charging" && robot.status !== "error") {
    robot.status = "working";
  }
}

function attachTaskToRobot(data: FleetData, robot: RobotState, task: Task): void {
  task.assignedRobotId = robot.id;
  if (!robot.currentTaskId && robot.status !== "paused" && robot.status !== "error") {
    robot.currentTaskId = task.id;
    task.status = "in_progress";
    if (robot.status !== "charging") {
      robot.status = "working";
    }
    return;
  }

  if (!robot.taskQueue.includes(task.id)) {
    robot.taskQueue.push(task.id);
  }
  if (task.status === "queued") {
    task.status = "assigned";
  }
}

function removeTaskFromRobot(data: FleetData, robot: RobotState, taskId: string): void {
  if (robot.currentTaskId === taskId) {
    robot.currentTaskId = null;
  }
  robot.taskQueue = robot.taskQueue.filter((queuedId) => queuedId !== taskId);
  nextTaskForRobot(data, robot);
}

export function pauseRobot(
  data: FleetData,
  input: { role: Role; robotId: string; reason?: string },
): MutationOutcome<{ robot: RobotState }> {
  if (input.role === "viewer") {
    return roleDenied(data, input.role, "pause_robot", { robotId: input.robotId });
  }

  const robotEntry = findRobotById(data, input.robotId);
  if (!robotEntry) {
    const result = { status: "fail", reason: "robot not found" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "pause_robot",
      robotId: input.robotId,
      result,
    });
    return { ok: false, status: 404, message: "Robot not found", result };
  }

  const robot: RobotState = { ...robotEntry };
  if (robot.status === "paused") {
    const result = { status: "fail", reason: "robot already paused" } satisfies CommandResult;
    addCommandForAction(data, {
      type: "pause",
      role: input.role,
      robotId: robot.id,
      result,
    });
    addAuditForAction(data, {
      role: input.role,
      action: "pause_robot",
      robotId: robot.id,
      result,
    });
    return { ok: false, status: 409, message: "Robot already paused", result };
  }

  robot.status = "paused";
  robot.lastSeen = new Date().toISOString();
  setRobotState(data, robot);

  const result = { status: "success" } satisfies CommandResult;
  addCommandForAction(data, {
    type: "pause",
    role: input.role,
    robotId: robot.id,
    result,
  });
  addAuditForAction(data, {
    role: input.role,
    action: "pause_robot",
    robotId: robot.id,
    result,
    payload: { reason: input.reason ?? "manual_pause" },
  });

  return {
    ok: true,
    status: 200,
    message: "Robot paused",
    result,
    data: { robot },
  };
}

export function resumeRobot(
  data: FleetData,
  input: { role: Role; robotId: string },
): MutationOutcome<{ robot: RobotState }> {
  if (input.role === "viewer") {
    return roleDenied(data, input.role, "resume_robot", { robotId: input.robotId });
  }

  const robotEntry = findRobotById(data, input.robotId);
  if (!robotEntry) {
    const result = { status: "fail", reason: "robot not found" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "resume_robot",
      robotId: input.robotId,
      result,
    });
    return { ok: false, status: 404, message: "Robot not found", result };
  }

  const robot: RobotState = { ...robotEntry };
  if (robot.status !== "paused") {
    const result = { status: "fail", reason: "robot is not paused" } satisfies CommandResult;
    addCommandForAction(data, {
      type: "resume",
      role: input.role,
      robotId: robot.id,
      result,
    });
    addAuditForAction(data, {
      role: input.role,
      action: "resume_robot",
      robotId: robot.id,
      result,
    });
    return { ok: false, status: 409, message: "Robot is not paused", result };
  }

  robot.status = robot.currentTaskId ? "working" : "idle";
  robot.lastSeen = new Date().toISOString();
  setRobotState(data, robot);

  const result = { status: "success" } satisfies CommandResult;
  addCommandForAction(data, {
    type: "resume",
    role: input.role,
    robotId: robot.id,
    result,
  });
  addAuditForAction(data, {
    role: input.role,
    action: "resume_robot",
    robotId: robot.id,
    result,
  });

  return {
    ok: true,
    status: 200,
    message: "Robot resumed",
    result,
    data: { robot },
  };
}

export function assignTask(
  data: FleetData,
  input: {
    role: Role;
    taskType: string;
    priority: number;
    destinationZone: string;
    notes?: string;
    assignedRobotId?: string;
  },
): MutationOutcome<{ task: Task; robot: RobotState }> {
  if (input.role === "viewer") {
    return roleDenied(data, input.role, "assign_task", { robotId: input.assignedRobotId });
  }

  const robots = listRobots(data);
  const selectedRobot = input.assignedRobotId
    ? robots.find((robot) => robot.id === input.assignedRobotId)
    : [...robots].sort((a, b) => {
        const aZoneBonus = a.zone === input.destinationZone ? 2 : 0;
        const bZoneBonus = b.zone === input.destinationZone ? 2 : 0;
        const aIdleBonus = a.status === "idle" ? 1 : 0;
        const bIdleBonus = b.status === "idle" ? 1 : 0;
        return bZoneBonus + bIdleBonus + b.battery - (aZoneBonus + aIdleBonus + a.battery);
      })[0];

  if (!selectedRobot) {
    const result = { status: "fail", reason: "no eligible robot found" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "assign_task",
      result,
      payload: {
        requestedRobotId: input.assignedRobotId,
      },
    });
    return { ok: false, status: 404, message: "No robot available", result };
  }

  const robot: RobotState = { ...selectedRobot };
  const task: Task = {
    id: generateId("task"),
    type: input.taskType,
    priority: input.priority,
    destinationZone: input.destinationZone,
    status: "queued",
    assignedRobotId: null,
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  attachTaskToRobot(data, robot, task);
  setRobotState(data, robot);
  data.tasks.push(task);

  const result = { status: "success" } satisfies CommandResult;
  addCommandForAction(data, {
    type: "assign_task",
    role: input.role,
    robotId: robot.id,
    taskId: task.id,
    result,
  });
  addAuditForAction(data, {
    role: input.role,
    action: "assign_task",
    robotId: robot.id,
    taskId: task.id,
    result,
    payload: {
      destinationZone: task.destinationZone,
      priority: task.priority,
      taskType: task.type,
    },
  });

  return {
    ok: true,
    status: 201,
    message: "Task assigned",
    result,
    data: { task, robot },
  };
}

export function rerouteTask(
  data: FleetData,
  input: { role: Role; taskId: string; targetRobotId: string },
): MutationOutcome<{ task: Task; fromRobotId?: string; toRobotId: string }> {
  if (input.role === "viewer") {
    return roleDenied(data, input.role, "reroute_task", { robotId: input.targetRobotId, taskId: input.taskId });
  }

  const task = data.tasks.find((candidate) => candidate.id === input.taskId);
  if (!task) {
    const result = { status: "fail", reason: "task not found" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "reroute_task",
      taskId: input.taskId,
      result,
    });
    return { ok: false, status: 404, message: "Task not found", result };
  }

  if (task.status === "cancelled" || task.status === "completed") {
    const result = {
      status: "fail",
      reason: `task is already ${task.status}`,
    } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "reroute_task",
      taskId: task.id,
      result,
    });
    return { ok: false, status: 409, message: "Task cannot be rerouted", result };
  }

  const targetRobotEntry = findRobotById(data, input.targetRobotId);
  if (!targetRobotEntry) {
    const result = { status: "fail", reason: "target robot not found" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "reroute_task",
      taskId: task.id,
      robotId: input.targetRobotId,
      result,
    });
    return { ok: false, status: 404, message: "Target robot not found", result };
  }

  const sourceRobotId = task.assignedRobotId ?? undefined;
  if (sourceRobotId && sourceRobotId === targetRobotEntry.id) {
    const result = { status: "fail", reason: "task is already on target robot" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "reroute_task",
      taskId: task.id,
      robotId: sourceRobotId,
      result,
    });
    return { ok: false, status: 409, message: "Task already assigned to target", result };
  }

  const targetRobot: RobotState = { ...targetRobotEntry };
  if (sourceRobotId) {
    const sourceRobotEntry = findRobotById(data, sourceRobotId);
    if (sourceRobotEntry) {
      const sourceRobot: RobotState = { ...sourceRobotEntry };
      removeTaskFromRobot(data, sourceRobot, task.id);
      setRobotState(data, sourceRobot);
    }
  }

  task.status = "queued";
  attachTaskToRobot(data, targetRobot, task);
  setRobotState(data, targetRobot);

  const result = { status: "success" } satisfies CommandResult;
  addCommandForAction(data, {
    type: "reroute",
    role: input.role,
    robotId: targetRobot.id,
    taskId: task.id,
    result,
  });
  addAuditForAction(data, {
    role: input.role,
    action: "reroute_task",
    robotId: targetRobot.id,
    taskId: task.id,
    result,
    payload: {
      fromRobotId: sourceRobotId ?? null,
      toRobotId: targetRobot.id,
    },
  });

  return {
    ok: true,
    status: 200,
    message: "Task rerouted",
    result,
    data: {
      task,
      fromRobotId: sourceRobotId,
      toRobotId: targetRobot.id,
    },
  };
}

export function cancelTask(
  data: FleetData,
  input: { role: Role; taskId: string; reason?: string },
): MutationOutcome<{ task: Task }> {
  if (input.role === "viewer") {
    return roleDenied(data, input.role, "cancel_task", { taskId: input.taskId });
  }

  const task = data.tasks.find((candidate) => candidate.id === input.taskId);
  if (!task) {
    const result = { status: "fail", reason: "task not found" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "cancel_task",
      taskId: input.taskId,
      result,
    });
    return { ok: false, status: 404, message: "Task not found", result };
  }

  if (task.status === "cancelled") {
    const result = { status: "fail", reason: "task is already cancelled" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "cancel_task",
      taskId: task.id,
      robotId: task.assignedRobotId ?? undefined,
      result,
    });
    return { ok: false, status: 409, message: "Task is already cancelled", result };
  }

  if (task.status === "completed") {
    const result = { status: "fail", reason: "completed task cannot be cancelled" } satisfies CommandResult;
    addAuditForAction(data, {
      role: input.role,
      action: "cancel_task",
      taskId: task.id,
      robotId: task.assignedRobotId ?? undefined,
      result,
    });
    return { ok: false, status: 409, message: "Completed task cannot be cancelled", result };
  }

  const robotId = task.assignedRobotId ?? undefined;
  if (robotId) {
    const robotEntry = findRobotById(data, robotId);
    if (robotEntry) {
      const robot: RobotState = { ...robotEntry };
      removeTaskFromRobot(data, robot, task.id);
      setRobotState(data, robot);
    }
  }

  task.status = "cancelled";
  task.assignedRobotId = null;

  const result = { status: "success" } satisfies CommandResult;
  addCommandForAction(data, {
    type: "cancel_task",
    role: input.role,
    robotId: robotId ?? "n/a",
    taskId: task.id,
    result,
  });
  addAuditForAction(data, {
    role: input.role,
    action: "cancel_task",
    taskId: task.id,
    robotId,
    result,
    payload: {
      reason: input.reason ?? "manual_cancel",
    },
  });

  return {
    ok: true,
    status: 200,
    message: "Task cancelled",
    result,
    data: { task },
  };
}

export function storeMode(): "kv" | "memory" {
  return isUsingKv() ? "kv" : "memory";
}
