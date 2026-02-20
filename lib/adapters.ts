import type {
  LocusPayload,
  LocusStatusCode,
  RobotState,
  RobotStatus,
  Vendor,
  VendorBPayload,
  VendorBStatusCode,
} from "@/lib/types";
import { clamp } from "@/lib/utils";

const locusToCanonicalStatus: Record<LocusStatusCode, RobotStatus> = {
  IDLE: "idle",
  WORKING: "working",
  CHARGING: "charging",
  ERROR: "error",
  PAUSED: "paused",
};

const canonicalToLocusStatus: Record<RobotStatus, LocusStatusCode> = {
  idle: "IDLE",
  working: "WORKING",
  charging: "CHARGING",
  error: "ERROR",
  paused: "PAUSED",
};

const vendorBToCanonicalStatus: Record<VendorBStatusCode, RobotStatus> = {
  idle: "idle",
  working: "working",
  charging: "charging",
  error: "error",
  paused: "paused",
};

const canonicalToVendorBStatus: Record<RobotStatus, VendorBStatusCode> = {
  idle: "idle",
  working: "working",
  charging: "charging",
  error: "error",
  paused: "paused",
};

export function mapLocusPayloadToRobotState(raw: LocusPayload): RobotState {
  return {
    id: raw.unit_id,
    vendor: "locus",
    zone: raw.telemetry.zone,
    position: {
      x: clamp(raw.telemetry.coord.x, 0, 100),
      y: clamp(raw.telemetry.coord.y, 0, 100),
    },
    battery: clamp(raw.telemetry.battery_pct, 0, 100),
    status: locusToCanonicalStatus[raw.telemetry.status_code],
    currentTaskId: raw.mission.current_task_id,
    taskQueue: [...raw.mission.queue],
    lastSeen: raw.telemetry.last_seen_iso,
  };
}

export function mapVendorBPayloadToRobotState(raw: VendorBPayload): RobotState {
  return {
    id: raw.robotId,
    vendor: "vendor_b",
    zone: raw.area,
    position: {
      x: clamp(raw.pose[0], 0, 100),
      y: clamp(raw.pose[1], 0, 100),
    },
    battery: clamp(raw.batteryLevel, 0, 100),
    status: vendorBToCanonicalStatus[raw.state],
    currentTaskId: raw.tasks.active,
    taskQueue: [...raw.tasks.queued],
    lastSeen: new Date(raw.heartbeat).toISOString(),
  };
}

export function mapRobotStateToLocusPayload(robot: RobotState): LocusPayload {
  return {
    unit_id: robot.id,
    telemetry: {
      zone: robot.zone,
      coord: {
        x: Number(robot.position.x.toFixed(2)),
        y: Number(robot.position.y.toFixed(2)),
      },
      battery_pct: Number(clamp(robot.battery, 0, 100).toFixed(1)),
      status_code: canonicalToLocusStatus[robot.status],
      last_seen_iso: robot.lastSeen,
    },
    mission: {
      current_task_id: robot.currentTaskId,
      queue: [...robot.taskQueue],
    },
  };
}

export function mapRobotStateToVendorBPayload(robot: RobotState): VendorBPayload {
  return {
    robotId: robot.id,
    area: robot.zone,
    pose: [Number(robot.position.x.toFixed(2)), Number(robot.position.y.toFixed(2))],
    batteryLevel: Number(clamp(robot.battery, 0, 100).toFixed(1)),
    state: canonicalToVendorBStatus[robot.status],
    tasks: {
      active: robot.currentTaskId,
      queued: [...robot.taskQueue],
    },
    heartbeat: new Date(robot.lastSeen).getTime(),
  };
}

export function mapRobotStateToVendorPayload(robot: RobotState): LocusPayload | VendorBPayload {
  if (robot.vendor === "locus") {
    return mapRobotStateToLocusPayload(robot);
  }
  return mapRobotStateToVendorBPayload(robot);
}

export function mapVendorPayloadToRobotState(
  vendor: Vendor,
  raw: LocusPayload | VendorBPayload,
): RobotState {
  if (vendor === "locus") {
    return mapLocusPayloadToRobotState(raw as LocusPayload);
  }
  return mapVendorBPayloadToRobotState(raw as VendorBPayload);
}
