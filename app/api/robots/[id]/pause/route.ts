import { NextResponse } from "next/server";
import { pauseRobot, withFleetData } from "@/lib/fleet";
import { getRoleFromHeaders } from "@/lib/roles";
import { pauseRobotSchema } from "@/lib/schemas";

interface RouteContext {
  params: { id: string };
}

export async function POST(request: Request, context: RouteContext) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = pauseRobotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const role = getRoleFromHeaders(request.headers);
  const robotId = decodeURIComponent(context.params.id);

  const outcome = await withFleetData((data) =>
    pauseRobot(data, {
      role,
      robotId,
      reason: parsed.data.reason,
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
