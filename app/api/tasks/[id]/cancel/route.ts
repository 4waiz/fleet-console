import { NextResponse } from "next/server";
import { cancelTask, withFleetData } from "@/lib/fleet";
import { getRoleFromHeaders } from "@/lib/roles";
import { cancelTaskSchema } from "@/lib/schemas";

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

  const parsed = cancelTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const role = getRoleFromHeaders(request.headers);
  const taskId = decodeURIComponent(context.params.id);

  const outcome = await withFleetData((data) =>
    cancelTask(data, {
      role,
      taskId,
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
