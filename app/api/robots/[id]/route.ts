import { NextResponse } from "next/server";
import { findRobotById, recentCommandsForRobot, withFleetData } from "@/lib/fleet";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function GET(_: Request, context: RouteContext) {
  const robotId = decodeURIComponent(context.params.id);

  const response = await withFleetData((data) => {
    const robot = findRobotById(data, robotId);
    if (!robot) {
      return null;
    }

    const queueSummary = {
      queuedCount: robot.taskQueue.length,
      hasCurrentTask: Boolean(robot.currentTaskId),
      currentTaskId: robot.currentTaskId,
    };

    return {
      robot,
      queueSummary,
      recentCommands: recentCommandsForRobot(data, robotId, 12),
    };
  });

  if (!response) {
    return NextResponse.json({ error: "Robot not found" }, { status: 404 });
  }

  return NextResponse.json(response);
}
