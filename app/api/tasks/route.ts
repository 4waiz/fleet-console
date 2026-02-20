import { NextRequest, NextResponse } from "next/server";
import { listTasks, queueSnapshots, withFleetData } from "@/lib/fleet";
import { tasksQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedQuery = tasksQuerySchema.safeParse(query);
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }

  const payload = await withFleetData((data) => {
    let tasks = listTasks(data);
    if (parsedQuery.data.status) {
      tasks = tasks.filter((task) => task.status === parsedQuery.data.status);
    }
    if (parsedQuery.data.assignedRobotId) {
      tasks = tasks.filter((task) => task.assignedRobotId === parsedQuery.data.assignedRobotId);
    }
    return {
      tasks,
      queues: queueSnapshots(data),
    };
  });

  return NextResponse.json(payload);
}
