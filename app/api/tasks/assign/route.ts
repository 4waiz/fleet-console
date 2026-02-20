import { NextResponse } from "next/server";
import { assignTask, withFleetData } from "@/lib/fleet";
import { getRoleFromHeaders } from "@/lib/roles";
import { assignTaskSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const role = getRoleFromHeaders(request.headers);
  const outcome = await withFleetData((data) =>
    assignTask(data, {
      role,
      taskType: parsed.data.type,
      priority: parsed.data.priority,
      destinationZone: parsed.data.destinationZone,
      notes: parsed.data.notes,
      assignedRobotId: parsed.data.assignedRobotId,
    }),
  );

  return NextResponse.json(
    {
      ok: outcome.ok,
      message: outcome.message,
      result: outcome.result,
      ...outcome.data,
    },
    { status: outcome.status },
  );
}
