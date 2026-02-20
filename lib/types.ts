export const ROLE_VALUES = ["viewer", "operator", "admin"] as const;
export type Role = (typeof ROLE_VALUES)[number];

export const VENDOR_VALUES = ["locus", "vendor_b"] as const;
export type Vendor = (typeof VENDOR_VALUES)[number];

export const ROBOT_STATUS_VALUES = [
  "idle",
  "working",
  "charging",
  "error",
  "paused",
] as const;
export type RobotStatus = (typeof ROBOT_STATUS_VALUES)[number];

export const TASK_STATUS_VALUES = [
  "queued",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

export interface Position {
  x: number;
  y: number;
}

export interface RobotState {
  id: string;
  vendor: Vendor;
  zone: string;
  position: Position;
  battery: number;
  status: RobotStatus;
  currentTaskId: string | null;
  taskQueue: string[];
  lastSeen: string;
}

export interface Task {
  id: string;
  type: string;
  priority: number;
  destinationZone: string;
  status: TaskStatus;
  assignedRobotId: string | null;
  notes?: string;
  createdAt: string;
}

export interface CommandResult {
  status: "success" | "fail";
  reason?: string;
}

export interface Command {
  id: string;
  type: "pause" | "resume" | "assign_task" | "reroute" | "cancel_task";
  robotId: string;
  taskId?: string;
  issuedByRole: Role;
  createdAt: string;
  result: CommandResult;
}

export interface AuditEvent {
  id: string;
  ts: string;
  actorRole: Role;
  action: string;
  robotId?: string;
  taskId?: string;
  result: CommandResult;
  vendor: Vendor | "system";
  payload: Record<string, unknown>;
}

export type LocusStatusCode =
  | "IDLE"
  | "WORKING"
  | "CHARGING"
  | "ERROR"
  | "PAUSED";

export interface LocusPayload {
  unit_id: string;
  telemetry: {
    zone: string;
    coord: Position;
    battery_pct: number;
    status_code: LocusStatusCode;
    last_seen_iso: string;
  };
  mission: {
    current_task_id: string | null;
    queue: string[];
  };
}

export type VendorBStatusCode =
  | "idle"
  | "working"
  | "charging"
  | "error"
  | "paused";

export interface VendorBPayload {
  robotId: string;
  area: string;
  pose: [number, number];
  batteryLevel: number;
  state: VendorBStatusCode;
  tasks: {
    active: string | null;
    queued: string[];
  };
  heartbeat: number;
}

export interface RobotWithRaw extends RobotState {
  rawPayload: LocusPayload | VendorBPayload;
}

export interface FleetData {
  locusPayloads: Record<string, LocusPayload>;
  vendorBPayloads: Record<string, VendorBPayload>;
  tasks: Task[];
  audit: AuditEvent[];
  commands: Command[];
  lastTick: number;
  initializedAt: string;
}

export interface QueueSnapshot {
  robotId: string;
  vendor: Vendor;
  status: RobotStatus;
  currentTaskId: string | null;
  queue: string[];
}
