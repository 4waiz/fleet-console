"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Mono } from "@/components/mono";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EndpointDoc {
  id: string;
  title: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  curl: string;
  requestExample?: string;
  responseExample: string;
}

const endpointDocs: EndpointDoc[] = [
  {
    id: "get-robots",
    title: "List Robots",
    method: "GET",
    path: "/api/robots",
    description: "Returns canonical robot state list. Supports vendor, status, and zone filters.",
    curl: "curl -s http://localhost:3000/api/robots?vendor=locus&status=error",
    responseExample: `{
  "robots": [{ "id": "amr-001", "vendor": "locus", "status": "working" }],
  "tickAt": "2026-02-20T10:25:30.000Z",
  "mode": "memory"
}`,
  },
  {
    id: "pause-robot",
    title: "Pause Robot",
    method: "POST",
    path: "/api/robots/:id/pause",
    description: "Used by Robot Detail quick action. Rejects viewer role.",
    curl: `curl -X POST http://localhost:3000/api/robots/amr-003/pause \\
  -H "Content-Type: application/json" \\
  -H "x-role: operator" \\
  -d '{"reason":"paused from robot detail"}'`,
    requestExample: `{
  "reason": "paused from robot detail"
}`,
    responseExample: `{
  "ok": true,
  "message": "Robot paused",
  "result": { "status": "success" },
  "robot": { "...canonical RobotState" }
}`,
  },
  {
    id: "assign-task",
    title: "Assign Task",
    method: "POST",
    path: "/api/tasks/assign",
    description: "Creates task and attaches it to selected or auto-dispatched robot.",
    curl: `curl -X POST http://localhost:3000/api/tasks/assign \\
  -H "Content-Type: application/json" \\
  -H "x-role: operator" \\
  -d '{"type":"pick","priority":3,"destinationZone":"zone_a","assignedRobotId":"amr-001"}'`,
    requestExample: `{
  "type": "pick",
  "priority": 3,
  "destinationZone": "zone_a",
  "assignedRobotId": "amr-001"
}`,
    responseExample: `{
  "ok": true,
  "message": "Task assigned",
  "result": { "status": "success" },
  "task": { "...Task" },
  "robot": { "...RobotState" }
}`,
  },
  {
    id: "reroute-task",
    title: "Reroute Task",
    method: "POST",
    path: "/api/tasks/:id/reroute",
    description: "Used by Robot Detail reroute action to move task to another robot queue.",
    curl: `curl -X POST http://localhost:3000/api/tasks/task-002/reroute \\
  -H "Content-Type: application/json" \\
  -H "x-role: operator" \\
  -d '{"targetRobotId":"amr-019"}'`,
    requestExample: `{
  "targetRobotId": "amr-019"
}`,
    responseExample: `{
  "ok": true,
  "message": "Task rerouted",
  "result": { "status": "success" },
  "task": { "...updated Task" },
  "fromRobotId": "amr-003",
  "toRobotId": "amr-019"
}`,
  },
  {
    id: "audit-log",
    title: "Read Audit Events",
    method: "GET",
    path: "/api/audit",
    description: "Filter by robot_id, action, result, and limit.",
    curl: "curl -s 'http://localhost:3000/api/audit?robot_id=amr-001&action=pause_robot&limit=20'",
    responseExample: `{
  "events": [
    { "id": "audit-1234", "action": "pause_robot", "result": { "status": "success" } }
  ]
}`,
  },
];

const schemaTable = {
  RobotState: [
    ["id", "string", "Canonical robot identifier"],
    ["vendor", `"locus" | "vendor_b"`, "Vendor source"],
    ["zone", "string", "Current zone label"],
    ["position", "{ x: number; y: number }", "2D coordinates"],
    ["battery", "number", "0-100 percentage"],
    ["status", `"idle" | "working" | "charging" | "error" | "paused"`, "Operational state"],
    ["currentTaskId", "string | null", "Active task"],
    ["taskQueue", "string[]", "Queued task ids"],
    ["lastSeen", "ISO datetime", "Heartbeat timestamp"],
  ],
  Task: [
    ["id", "string", "Task identifier"],
    ["type", "string", "Task type label"],
    ["priority", "1-5", "Priority rank"],
    ["destinationZone", "string", "Target zone"],
    ["status", `"queued" | "assigned" | "in_progress" | "completed" | "cancelled"`, "Task lifecycle"],
    ["assignedRobotId", "string | null", "Robot assignment"],
    ["createdAt", "ISO datetime", "Creation timestamp"],
  ],
  Command: [
    ["id", "string", "Command identifier"],
    ["type", `"pause" | "resume" | "assign_task" | "reroute" | "cancel_task"`, "Command type"],
    ["robotId", "string", "Target robot id"],
    ["taskId", "string | undefined", "Task context"],
    ["issuedByRole", `"viewer" | "operator" | "admin"`, "Role in request header"],
    ["createdAt", "ISO datetime", "Command timestamp"],
  ],
  AuditEvent: [
    ["id", "string", "Audit event identifier"],
    ["ts", "ISO datetime", "Event timestamp"],
    ["actorRole", `"viewer" | "operator" | "admin"`, "Actor role"],
    ["action", "string", "Action keyword"],
    ["robotId", "string | undefined", "Related robot"],
    ["taskId", "string | undefined", "Related task"],
    ["result", `{ status: "success" | "fail"; reason?: string }`, "Action outcome"],
    ["vendor", `"locus" | "vendor_b" | "system"`, "Vendor attribution"],
    ["payload", "Record<string, unknown>", "Extended payload context"],
  ],
} as const;

export function ApiDocsClient() {
  const prefersReducedMotion = useReducedMotion();

  const copyCurl = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      toast.success("cURL copied");
    } catch {
      toast.error("Unable to copy command");
    }
  };

  return (
    <motion.div
      className="grid gap-6 lg:grid-cols-[260px_1fr]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endpoints</CardTitle>
            <CardDescription>Navigate API contract sections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {endpointDocs.map((endpoint) => (
              <a
                key={endpoint.id}
                href={`#${endpoint.id}`}
                className="block rounded-2xl border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-muted/60"
              >
                <span className="inline-flex items-center gap-2">
                  <Badge variant={endpoint.method === "GET" ? "secondary" : "outline"}>{endpoint.method}</Badge>
                  {endpoint.title}
                </span>
              </a>
            ))}
            <a
              href="#schemas"
              className="block rounded-2xl border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-muted/60"
            >
              Canonical Schemas
            </a>
          </CardContent>
        </Card>
      </aside>

      <div className="space-y-5">
        {endpointDocs.map((endpoint) => (
          <Card key={endpoint.id} id={endpoint.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{endpoint.title}</CardTitle>
                  <CardDescription>{endpoint.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={endpoint.method === "GET" ? "secondary" : "outline"}>{endpoint.method}</Badge>
                  <Mono>{endpoint.path}</Mono>
                  <Button variant="secondary" size="sm" onClick={() => void copyCurl(endpoint.curl)}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy cURL
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="curl" className="space-y-2">
                <AccordionItem value="curl">
                  <AccordionTrigger>cURL</AccordionTrigger>
                  <AccordionContent>
                    <pre className="overflow-auto rounded-2xl bg-[hsl(30_19%_15%)] p-4 text-xs text-[hsl(41_38%_94%)]">
                      {endpoint.curl}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
                {endpoint.requestExample ? (
                  <AccordionItem value="request">
                    <AccordionTrigger>Request Example</AccordionTrigger>
                    <AccordionContent>
                      <pre className="overflow-auto rounded-2xl bg-[hsl(30_19%_15%)] p-4 text-xs text-[hsl(41_38%_94%)]">
                        {endpoint.requestExample}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
                <AccordionItem value="response">
                  <AccordionTrigger>Response Example</AccordionTrigger>
                  <AccordionContent>
                    <pre className="overflow-auto rounded-2xl bg-[hsl(30_19%_15%)] p-4 text-xs text-[hsl(41_38%_94%)]">
                      {endpoint.responseExample}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}

        <Card id="schemas">
          <CardHeader>
            <CardTitle>Canonical Schemas</CardTitle>
            <CardDescription>Shared normalized shapes across routes and UI.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="RobotState">
              <TabsList className="mb-4">
                {Object.keys(schemaTable).map((schemaName) => (
                  <TabsTrigger key={schemaName} value={schemaName}>
                    {schemaName}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(schemaTable).map(([schemaName, rows]) => (
                <TabsContent key={schemaName} value={schemaName}>
                  <div className="overflow-hidden rounded-3xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/55">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">field</th>
                          <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">type</th>
                          <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(([field, type, description]) => (
                          <tr key={`${schemaName}-${field}`} className="border-t border-border bg-card/50">
                            <td className="px-4 py-3">
                              <Mono>{field}</Mono>
                            </td>
                            <td className="px-4 py-3">
                              <Mono className="text-[11px]">{type}</Mono>
                            </td>
                            <td className="px-4 py-3 text-sm">{description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
