import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const endpointRows = [
  { method: "GET", path: "/api/robots", notes: "Canonical robot state list (supports vendor/status/zone query)." },
  { method: "GET", path: "/api/robots/:id", notes: "Single robot detail + queue summary + recent commands." },
  { method: "GET", path: "/api/tasks", notes: "Tasks plus queue snapshot per robot." },
  { method: "POST", path: "/api/tasks/assign", notes: "Assign task (role-gated; viewer rejected)." },
  { method: "POST", path: "/api/robots/:id/pause", notes: "Pause robot command." },
  { method: "POST", path: "/api/robots/:id/resume", notes: "Resume robot command." },
  { method: "POST", path: "/api/tasks/:id/reroute", notes: "Move task from one robot to another." },
  { method: "POST", path: "/api/tasks/:id/cancel", notes: "Cancel queued/in-progress task." },
  { method: "GET", path: "/api/audit", notes: "Audit events with filters: robot_id, action, result, limit." },
];

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Docs</h1>
        <p className="text-sm text-muted-foreground">
          Normalized endpoints and schemas for the fleet control demo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>All mutating endpoints require `x-role: operator|admin`.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">method</th>
                  <th className="px-3 py-2">path</th>
                  <th className="px-3 py-2">notes</th>
                </tr>
              </thead>
              <tbody>
                {endpointRows.map((row) => (
                  <tr key={`${row.method}-${row.path}`} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{row.method}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.path}</td>
                    <td className="px-3 py-2">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canonical Schemas</CardTitle>
          <CardDescription>Shared object model used across pages and routes.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{`RobotState {
  id, vendor, zone, position:{x,y}, battery, status,
  currentTaskId, taskQueue, lastSeen
}

Task {
  id, type, priority, destinationZone,
  status, assignedRobotId, createdAt
}

Command {
  id, type, robotId, taskId?, issuedByRole, createdAt
}

AuditEvent {
  id, ts, actorRole, action, robotId?, taskId?,
  result, vendor, payload
}`}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pause Example (used by Robot Detail)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{`POST /api/robots/amr-003/pause
x-role: operator
Content-Type: application/json

{
  "reason": "paused from robot detail"
}

Response 200
{
  "ok": true,
  "message": "Robot paused",
  "result": { "status": "success" },
  "robot": { "...canonical RobotState" }
}`}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reroute Example (used by Robot Detail)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{`POST /api/tasks/task-002/reroute
x-role: operator
Content-Type: application/json

{
  "targetRobotId": "amr-019"
}

Response 200
{
  "ok": true,
  "message": "Task rerouted",
  "result": { "status": "success" },
  "task": { "...updated Task" },
  "fromRobotId": "amr-003",
  "toRobotId": "amr-019"
}`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
