import { NextResponse } from "next/server";
import { rerouteTask, withFleetData } from "@/lib/fleet";
import { getRoleFromHeaders } from "@/lib/roles";
import { rerouteTaskSchema } from "@/lib/schemas";

interface RouteContext {
  params: { id: string };
}

export async function POST(request: Request, context: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = rerouteTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const role = getRoleFromHeaders(request.headers);
  const taskId = decodeURIComponent(context.params.id);

  const outcome = await withFleetData((data) =>
    rerouteTask(data, {
      role,
      taskId,
      targetRobotId: parsed.data.targetRobotId,
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
