"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, BatteryCharging, Bot, CircleDashed, Loader2 } from "lucide-react";
import { RobotStatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { RobotWithRaw } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RobotsResponse {
  robots: RobotWithRaw[];
  tickAt: string;
  mode: "kv" | "memory";
}

type ViewMode = "canonical" | "locus" | "vendor_b";

export function FleetOverviewClient() {
  const router = useRouter();
  const [robots, setRobots] = useState<RobotWithRaw[]>([]);
  const [storeMode, setStoreMode] = useState<"kv" | "memory">("memory");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState<"all" | "locus" | "vendor_b">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RobotWithRaw["status"]>("all");
  const [zoneFilter, setZoneFilter] = useState<"all" | string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("canonical");
  const [changedRows, setChangedRows] = useState<string[]>([]);
  const previousRef = useRef<Map<string, RobotWithRaw>>(new Map());
  const clearAnimationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRobots = useCallback(async () => {
    try {
      const response = await fetch("/api/robots", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch robots (${response.status})`);
      }
      const payload = (await response.json()) as RobotsResponse;
      setStoreMode(payload.mode);
      setError(null);

      const changed: string[] = [];
      for (const robot of payload.robots) {
        const previous = previousRef.current.get(robot.id);
        if (
          previous &&
          (previous.status !== robot.status ||
            previous.currentTaskId !== robot.currentTaskId ||
            Math.round(previous.battery) !== Math.round(robot.battery) ||
            previous.position.x !== robot.position.x ||
            previous.position.y !== robot.position.y)
        ) {
          changed.push(robot.id);
        }
      }
      previousRef.current = new Map(payload.robots.map((robot) => [robot.id, robot]));
      setRobots(payload.robots);
      setChangedRows(changed);
      if (clearAnimationTimer.current) {
        clearTimeout(clearAnimationTimer.current);
      }
      clearAnimationTimer.current = setTimeout(() => setChangedRows([]), 1200);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load robots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRobots();
    const interval = setInterval(() => void fetchRobots(), 3000);
    return () => {
      clearInterval(interval);
      if (clearAnimationTimer.current) {
        clearTimeout(clearAnimationTimer.current);
      }
    };
  }, [fetchRobots]);

  const zoneOptions = useMemo(
    () =>
      Array.from(new Set(robots.map((robot) => robot.zone))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [robots],
  );
  const statusOptions = useMemo(
    () =>
      Array.from(new Set(robots.map((robot) => robot.status))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [robots],
  );

  const filteredRobots = useMemo(() => {
    return robots.filter((robot) => {
      if (vendorFilter !== "all" && robot.vendor !== vendorFilter) {
        return false;
      }
      if (statusFilter !== "all" && robot.status !== statusFilter) {
        return false;
      }
      if (zoneFilter !== "all" && robot.zone !== zoneFilter) {
        return false;
      }
      return true;
    });
  }, [robots, statusFilter, vendorFilter, zoneFilter]);

  const fleetCounts = useMemo(() => {
    return {
      total: robots.length,
      idle: robots.filter((robot) => robot.status === "idle").length,
      working: robots.filter((robot) => robot.status === "working").length,
      charging: robots.filter((robot) => robot.status === "charging").length,
      error: robots.filter((robot) => robot.status === "error").length,
    };
  }, [robots]);

  const samplePayload = useMemo(() => {
    if (viewMode === "canonical") {
      return null;
    }
    const candidate = filteredRobots.find((robot) => robot.vendor === viewMode);
    return candidate?.rawPayload ?? null;
  }, [filteredRobots, viewMode]);

  const statCards = [
    {
      label: "Total Robots",
      value: fleetCounts.total,
      icon: Bot,
    },
    {
      label: "Idle",
      value: fleetCounts.idle,
      icon: CircleDashed,
    },
    {
      label: "Working",
      value: fleetCounts.working,
      icon: Activity,
    },
    {
      label: "Charging",
      value: fleetCounts.charging,
      icon: BatteryCharging,
    },
    {
      label: "Error",
      value: fleetCounts.error,
      icon: AlertCircle,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl">{card.value}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Fleet Table</CardTitle>
              <CardDescription>
                Polling every 3s. Click a row to open robot detail.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={storeMode === "kv" ? "default" : "secondary"}>
                Store: {storeMode === "kv" ? "Vercel KV" : "In-Memory Fallback"}
              </Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={vendorFilter} onValueChange={(value) => setVendorFilter(value as typeof vendorFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vendor: all</SelectItem>
                <SelectItem value="locus">Vendor: locus</SelectItem>
                <SelectItem value="vendor_b">Vendor: vendor_b</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: all</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    Status: {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={zoneFilter} onValueChange={(value) => setZoneFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Zone: all</SelectItem>
                {zoneOptions.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    Zone: {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger>
                <SelectValue placeholder="View Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="canonical">View as canonical</SelectItem>
                <SelectItem value="locus">View as vendor payload (locus)</SelectItem>
                <SelectItem value="vendor_b">View as vendor payload (vendor_b)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading fleet state...
            </div>
          ) : null}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          {viewMode !== "canonical" ? (
            <Card className="border-dashed bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sample {viewMode} payload</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                  {samplePayload
                    ? JSON.stringify(samplePayload, null, 2)
                    : `No ${viewMode} robots in the current filtered result.`}
                </pre>
              </CardContent>
            </Card>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>robot_id</TableHead>
                <TableHead>vendor</TableHead>
                {viewMode === "canonical" ? (
                  <>
                    <TableHead>battery</TableHead>
                    <TableHead>status</TableHead>
                    <TableHead>zone</TableHead>
                    <TableHead>position(x,y)</TableHead>
                    <TableHead>current_task</TableHead>
                    <TableHead>last_seen</TableHead>
                  </>
                ) : (
                  <TableHead>payload preview</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRobots.map((robot) => (
                <TableRow
                  key={robot.id}
                  className={cn(
                    "cursor-pointer",
                    changedRows.includes(robot.id) && "animate-pulse bg-accent/55",
                  )}
                  onClick={() => router.push(`/robots/${encodeURIComponent(robot.id)}`)}
                >
                  <TableCell className="font-mono text-xs">{robot.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{robot.vendor}</Badge>
                  </TableCell>
                  {viewMode === "canonical" ? (
                    <>
                      <TableCell>{Math.round(robot.battery)}%</TableCell>
                      <TableCell>
                        <RobotStatusBadge status={robot.status} />
                      </TableCell>
                      <TableCell>{robot.zone}</TableCell>
                      <TableCell className="font-mono text-xs">
                        ({robot.position.x.toFixed(1)}, {robot.position.y.toFixed(1)})
                      </TableCell>
                      <TableCell className="font-mono text-xs">{robot.currentTaskId ?? "-"}</TableCell>
                      <TableCell>{new Date(robot.lastSeen).toLocaleTimeString()}</TableCell>
                    </>
                  ) : (
                    <TableCell>
                      <code className="line-clamp-2 text-xs">
                        {JSON.stringify(robot.rawPayload).slice(0, 180)}
                      </code>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredRobots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={viewMode === "canonical" ? 8 : 3} className="text-center text-muted-foreground">
                    No robots match current filters.
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
