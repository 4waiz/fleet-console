import { z } from "zod";
import {
  ROBOT_STATUS_VALUES,
  ROLE_VALUES,
  TASK_STATUS_VALUES,
  VENDOR_VALUES,
} from "@/lib/types";

export const roleSchema = z.enum(ROLE_VALUES);

export const assignTaskSchema = z.object({
  type: z.string().min(2).max(60),
  priority: z.coerce.number().int().min(1).max(5),
  destinationZone: z.string().min(2).max(40),
  notes: z.string().trim().max(240).optional(),
  assignedRobotId: z.string().min(3).max(40).optional(),
});

export const pauseRobotSchema = z
  .object({
    reason: z.string().trim().max(120).optional(),
  })
  .optional()
  .default({});

export const rerouteTaskSchema = z.object({
  targetRobotId: z.string().min(3).max(40),
});

export const cancelTaskSchema = z
  .object({
    reason: z.string().trim().max(120).optional(),
  })
  .optional()
  .default({});

export const robotsQuerySchema = z.object({
  vendor: z.enum(VENDOR_VALUES).optional(),
  status: z.enum(ROBOT_STATUS_VALUES).optional(),
  zone: z.string().min(1).optional(),
});

export const tasksQuerySchema = z.object({
  status: z.enum(TASK_STATUS_VALUES).optional(),
  assignedRobotId: z.string().optional(),
});

export const auditQuerySchema = z.object({
  robot_id: z.string().optional(),
  action: z.string().optional(),
  result: z.enum(["success", "fail"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
