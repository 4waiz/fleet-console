import { NextRequest, NextResponse } from "next/server";
import { listRobots, storeMode, withFleetData } from "@/lib/fleet";
import { robotsQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedQuery = robotsQuerySchema.safeParse(query);
  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = await withFleetData((state) => {
    let robots = listRobots(state);
    if (parsedQuery.data.vendor) {
      robots = robots.filter((robot) => robot.vendor === parsedQuery.data.vendor);
    }
    if (parsedQuery.data.status) {
      robots = robots.filter((robot) => robot.status === parsedQuery.data.status);
    }
    if (parsedQuery.data.zone) {
      robots = robots.filter((robot) => robot.zone === parsedQuery.data.zone);
    }

    return {
      robots,
      tickAt: new Date(state.lastTick).toISOString(),
      mode: storeMode(),
    };
  });

  return NextResponse.json(data);
}
