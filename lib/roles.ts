import { roleSchema } from "@/lib/schemas";
import type { Role } from "@/lib/types";

export function getRoleFromHeaders(headers: Headers): Role {
  const parsed = roleSchema.safeParse(headers.get("x-role") ?? "viewer");
  return parsed.success ? parsed.data : "viewer";
}

export function canMutate(role: Role): boolean {
  return role !== "viewer";
}
