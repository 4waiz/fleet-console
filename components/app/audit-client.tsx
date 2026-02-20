"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Mono } from "@/components/mono";
import { CommandResultBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditEvent } from "@/lib/types";

interface AuditResponse {
  events: AuditEvent[];
}

export function AuditClient() {
  const prefersReducedMotion = useReducedMotion();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [robotId, setRobotId] = useState("");
  const [action, setAction] = useState("all");
  const [result, setResult] = useState<"all" | "success" | "fail">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadAudit();
    const interval = setInterval(() => void loadAudit(), 3000);
    return () => clearInterval(interval);
  }, [loadAudit]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.action))).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const handleExportJson = () => {
    if (events.length === 0) {
      toast.error("No events available for export.");
      return;
    }
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fleet-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success("Audit JSON exported.");
  };

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Immutable Event Ledger</CardTitle>
              <CardDescription>Append-only command trail with role, payload, and result context.</CardDescription>
            </div>
            <Button variant="secondary" className="w-full sm:w-auto" onClick={handleExportJson}>
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
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
          {error ? <div className="mb-3 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm">{error}</div> : null}

          {loading && events.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border">
              <Table className="min-w-[1120px]">
                <TableHeader className="bg-primary text-primary-foreground">
                  <TableRow className="hover:translate-y-0 hover:bg-primary hover:shadow-none">
                    <TableHead className="text-primary-foreground/85">timestamp</TableHead>
                    <TableHead className="text-primary-foreground/85">actor(role)</TableHead>
                    <TableHead className="text-primary-foreground/85">action</TableHead>
                    <TableHead className="text-primary-foreground/85">robot_id</TableHead>
                    <TableHead className="text-primary-foreground/85">task_id</TableHead>
                    <TableHead className="text-primary-foreground/85">result</TableHead>
                    <TableHead className="text-primary-foreground/85">vendor</TableHead>
                    <TableHead className="text-primary-foreground/85">payload preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} className="bg-card/40">
                      <TableCell className="py-3 text-xs">{new Date(event.ts).toLocaleString()}</TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline">{event.actorRole}</Badge>
                      </TableCell>
                      <TableCell className="py-3 text-sm">{event.action}</TableCell>
                      <TableCell className="py-3">
                        <Mono>{event.robotId ?? "-"}</Mono>
                      </TableCell>
                      <TableCell className="py-3">
                        <Mono>{event.taskId ?? "-"}</Mono>
                      </TableCell>
                      <TableCell className="py-3">
                        <CommandResultBadge result={event.result} />
                      </TableCell>
                      <TableCell className="py-3 text-sm">{event.vendor}</TableCell>
                      <TableCell className="py-3">
                        <Mono className="line-clamp-2 max-w-[280px] whitespace-normal text-[11px] text-muted-foreground">
                          {JSON.stringify(event.payload)}
                        </Mono>
                      </TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 ? (
                    <TableRow className="hover:translate-y-0 hover:bg-card hover:shadow-none">
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No audit events for current filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
