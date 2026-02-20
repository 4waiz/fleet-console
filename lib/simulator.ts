import {
  mapLocusPayloadToRobotState,
  mapRobotStateToLocusPayload,
  mapRobotStateToVendorBPayload,
  mapVendorBPayloadToRobotState,
} from "@/lib/adapters";
import type { AuditEvent, FleetData, RobotState } from "@/lib/types";
import { chance, clamp, generateId, randomFloat } from "@/lib/utils";

function getCanonicalRobots(data: FleetData): RobotState[] {
  return [
    ...Object.values(data.locusPayloads).map((raw) => mapLocusPayloadToRobotState(raw)),
    ...Object.values(data.vendorBPayloads).map((raw) => mapVendorBPayloadToRobotState(raw)),
  ];
}

function setCanonicalRobot(data: FleetData, robot: RobotState): void {
  if (robot.vendor === "locus") {
    data.locusPayloads[robot.id] = mapRobotStateToLocusPayload(robot);
  } else {
    data.vendorBPayloads[robot.id] = mapRobotStateToVendorBPayload(robot);
  }
}

function pushAuditEvent(data: FleetData, event: AuditEvent) {
  data.audit.push(event);
  if (data.audit.length > 2000) {
    data.audit = data.audit.slice(-2000);
  }
}

export function runSimulationTick(data: FleetData, nowMs = Date.now()): void {
  const nowIso = new Date(nowMs).toISOString();
  const robots = getCanonicalRobots(data);
  const taskMap = new Map(data.tasks.map((task) => [task.id, task]));

  for (const robot of robots) {
    if (robot.status !== "paused") {
      robot.position.x = clamp(robot.position.x + randomFloat(-1.8, 1.8), 0, 100);
      robot.position.y = clamp(robot.position.y + randomFloat(-1.8, 1.8), 0, 100);
    }

    const batteryDelta =
      robot.status === "charging" ? randomFloat(0.25, 1.6) : randomFloat(-1.6, -0.15);
    robot.battery = clamp(robot.battery + batteryDelta, 0, 100);

    if (robot.status !== "paused" && robot.status !== "error" && robot.battery <= 12) {
      robot.status = "charging";
    } else if (robot.status === "charging" && robot.battery >= 95 && chance(0.35)) {
      robot.status = "idle";
    }

    if (robot.status !== "paused" && robot.status !== "error" && chance(0.008)) {
      robot.status = "error";
      pushAuditEvent(data, {
        id: generateId("audit"),
        ts: nowIso,
        actorRole: "admin",
        action: "sim_error",
        robotId: robot.id,
        result: { status: "fail", reason: "Transient navigation fault" },
        vendor: robot.vendor,
        payload: {
          code: "NAV_FAULT",
          battery: Number(robot.battery.toFixed(1)),
        },
      });
    } else if (robot.status === "error" && chance(0.2)) {
      robot.status = "idle";
    }

    if (robot.currentTaskId && robot.status === "working" && chance(0.14)) {
      const completedTask = taskMap.get(robot.currentTaskId);
      if (completedTask) {
        completedTask.status = "completed";
      }

      const nextTaskId = robot.taskQueue.shift() ?? null;
      robot.currentTaskId = nextTaskId;
      if (nextTaskId) {
        const nextTask = taskMap.get(nextTaskId);
        if (nextTask) {
          nextTask.status = "in_progress";
          nextTask.assignedRobotId = robot.id;
        }
        robot.status = "working";
      } else if (robot.status !== "charging" && robot.status !== "paused") {
        robot.status = "idle";
      }

      pushAuditEvent(data, {
        id: generateId("audit"),
        ts: nowIso,
        actorRole: "admin",
        action: "task_completed",
        robotId: robot.id,
        taskId: completedTask?.id,
        result: { status: "success" },
        vendor: robot.vendor,
        payload: {
          nextTaskId,
        },
      });
    }

    if (!robot.currentTaskId && robot.taskQueue.length > 0 && robot.status === "idle" && chance(0.45)) {
      const nextTaskId = robot.taskQueue.shift() ?? null;
      robot.currentTaskId = nextTaskId;
      if (nextTaskId) {
        const nextTask = taskMap.get(nextTaskId);
        if (nextTask) {
          nextTask.status = "in_progress";
          nextTask.assignedRobotId = robot.id;
        }
        robot.status = "working";
      }
    }

    if (!robot.currentTaskId && robot.status === "working" && robot.status !== "paused") {
      robot.status = "idle";
    }

    if (robot.currentTaskId && robot.status === "idle") {
      robot.status = "working";
    }

    robot.lastSeen = nowIso;
    setCanonicalRobot(data, robot);
  }

  for (const task of data.tasks) {
    if (!task.assignedRobotId || task.status === "completed" || task.status === "cancelled") {
      continue;
    }
    const robot = robots.find((candidate) => candidate.id === task.assignedRobotId);
    if (!robot) {
      task.assignedRobotId = null;
      task.status = "queued";
      continue;
    }

    if (robot.currentTaskId === task.id) {
      task.status = "in_progress";
    } else if (robot.taskQueue.includes(task.id)) {
      task.status = "assigned";
    }
  }

  data.lastTick = nowMs;
}
