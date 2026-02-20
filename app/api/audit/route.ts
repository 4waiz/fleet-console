import { NextRequest, NextResponse } from "next/server";
import { listAudit, withFleetData } from "@/lib/fleet";
import { auditQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = auditQuerySchema.safeParse(query);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, { status: 400 });
  }

  const audit = await withFleetData((data) =>
    listAudit(data, {
      robotId: parsed.data.robot_id,
      action: parsed.data.action,
      result: parsed.data.result,
      limit: parsed.data.limit ?? 200,
    }),
  );

  return NextResponse.json({ events: audit });
}
