import { NextResponse } from "next/server";
import { resumeRobot, withFleetData } from "@/lib/fleet";
import { getRoleFromHeaders } from "@/lib/roles";

interface RouteContext {
  params: { id: string };
}

export async function POST(request: Request, context: RouteContext) {
  const role = getRoleFromHeaders(request.headers);
  const robotId = decodeURIComponent(context.params.id);

  const outcome = await withFleetData((data) =>
    resumeRobot(data, {
      role,
      robotId,
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
