"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditEvent } from "@/lib/types";

interface AuditResponse {
  events: AuditEvent[];
}

export function AuditClient() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [robotId, setRobotId] = useState("");
  const [action, setAction] = useState("all");
  const [result, setResult] = useState<"all" | "success" | "fail">("all");
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    if (robotId.trim()) {
      params.set("robot_id", robotId.trim());
    }
    if (action !== "all") {
      params.set("action", action);
    }
    if (result !== "all") {
      params.set("result", result);
    }
    return params.toString();
  }, [action, result, robotId]);

  const loadAudit = useCallback(async () => {
    try {
      const response = await fetch(`/api/audit?${queryString}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch audit (${response.status})`);
      }
      const payload = (await response.json()) as AuditResponse;
      setEvents(payload.events);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to fetch audit events");
    }
  }, [queryString]);

  useEffect(() => {
    void loadAudit();
    const interval = setInterval(() => void loadAudit(), 3000);
    return () => clearInterval(interval);
  }, [loadAudit]);

  const uniqueActions = useMemo(() => {
    return [...new Set(events.map((event) => event.action))].sort((a, b) => a.localeCompare(b));
  }, [events]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>
            Immutable-style events stream. Deletion is intentionally not available.
          </CardDescription>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Filter robot_id"
              value={robotId}
              onChange={(event) => setRobotId(event.target.value)}
            />
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="Action filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Action: all</SelectItem>
                {uniqueActions.map((item) => (
                  <SelectItem key={item} value={item}>
                    Action: {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={result} onValueChange={(value) => setResult(value as typeof result)}>
              <SelectTrigger>
                <SelectValue placeholder="Result filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Result: all</SelectItem>
                <SelectItem value="success">Result: success</SelectItem>
                <SelectItem value="fail">Result: fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>timestamp</TableHead>
                <TableHead>actor(role)</TableHead>
                <TableHead>action</TableHead>
                <TableHead>robot_id</TableHead>
                <TableHead>task_id</TableHead>
                <TableHead>result</TableHead>
                <TableHead>vendor</TableHead>
                <TableHead>payload preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{new Date(event.ts).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.actorRole}</Badge>
                  </TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell className="font-mono text-xs">{event.robotId ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{event.taskId ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={event.result.status === "success" ? "secondary" : "destructive"}>
                      {event.result.status}
                    </Badge>
                    {event.result.reason ? (
                      <span className="ml-2 text-xs text-muted-foreground">{event.result.reason}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{event.vendor}</TableCell>
                  <TableCell>
                    <code className="line-clamp-2 text-xs">{JSON.stringify(event.payload).slice(0, 110)}</code>
                  </TableCell>
                </TableRow>
              ))}
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No audit events for current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
