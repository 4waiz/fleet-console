import {
  mapRobotStateToLocusPayload,
  mapRobotStateToVendorBPayload,
} from "@/lib/adapters";
import type {
  AuditEvent,
  FleetData,
  Role,
  RobotState,
  RobotStatus,
  Task,
  Vendor,
} from "@/lib/types";
import { chance, generateId, randomFloat, randomInt } from "@/lib/utils";

const ZONES = ["zone_a", "zone_b", "zone_c"] as const;
const ROBOT_STATUSES: RobotStatus[] = ["idle", "working", "charging", "idle", "idle", "error"];

function makeRobot(index: number, vendor: Vendor, now: Date): RobotState {
  const id = `amr-${String(index + 1).padStart(3, "0")}`;
  const status = ROBOT_STATUSES[randomInt(0, ROBOT_STATUSES.length - 1)];
  const batteryBase = status === "charging" ? randomInt(10, 70) : randomInt(35, 100);
  const lastSeenOffsetMs = randomInt(0, 25_000);
  return {
    id,
    vendor,
    zone: ZONES[randomInt(0, ZONES.length - 1)],
    position: {
      x: Number(randomFloat(4, 96).toFixed(2)),
      y: Number(randomFloat(4, 96).toFixed(2)),
    },
    battery: batteryBase,
    status,
    currentTaskId: null,
    taskQueue: [],
    lastSeen: new Date(now.getTime() - lastSeenOffsetMs).toISOString(),
  };
}

function makeTask(index: number, now: Date): Task {
  const taskTypes = ["pick", "dropoff", "cycle_count", "tow"];
  return {
    id: `task-${String(index + 1).padStart(3, "0")}`,
    type: taskTypes[index % taskTypes.length],
    priority: randomInt(1, 5),
    destinationZone: ZONES[randomInt(0, ZONES.length - 1)],
    status: "queued",
    assignedRobotId: null,
    createdAt: new Date(now.getTime() - randomInt(0, 100_000)).toISOString(),
    notes: chance(0.45) ? "Seeded demo task" : undefined,
  };
}

function seedAudit(role: Role, action: string, payload: Record<string, unknown>): AuditEvent {
  return {
    id: generateId("audit"),
    ts: new Date().toISOString(),
    actorRole: role,
    action,
    result: { status: "success" },
    vendor: "system",
    payload,
  };
}

export function createSeedFleetData(): FleetData {
  const now = new Date();
  const robots: RobotState[] = Array.from({ length: 30 }, (_, idx) =>
    makeRobot(idx, idx % 2 === 0 ? "locus" : "vendor_b", now),
  );

  const tasks = Array.from({ length: 5 }, (_, idx) => makeTask(idx, now));
  for (const task of tasks) {
    const robot = robots[randomInt(0, robots.length - 1)];
    task.assignedRobotId = robot.id;
    if (!robot.currentTaskId && robot.status !== "charging" && robot.status !== "error") {
      robot.currentTaskId = task.id;
      robot.status = "working";
      task.status = "in_progress";
    } else {
      robot.taskQueue.push(task.id);
      task.status = "assigned";
    }
  }

  const locusPayloads: FleetData["locusPayloads"] = {};
  const vendorBPayloads: FleetData["vendorBPayloads"] = {};
  for (const robot of robots) {
    if (robot.vendor === "locus") {
      locusPayloads[robot.id] = mapRobotStateToLocusPayload(robot);
    } else {
      vendorBPayloads[robot.id] = mapRobotStateToVendorBPayload(robot);
    }
  }

  return {
    locusPayloads,
    vendorBPayloads,
    tasks,
    audit: [
      seedAudit("admin", "system_seed", { message: "Initial fleet state generated" }),
      seedAudit("operator", "task_seed", { seededTasks: tasks.length }),
    ],
    commands: [],
    lastTick: Date.now(),
    initializedAt: now.toISOString(),
  };
}
