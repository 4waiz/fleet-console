"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, AlertCircle, BatteryCharging, Bot, CircleDashed } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { Mono } from "@/components/mono";
import { RobotStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const prefersReducedMotion = useReducedMotion();
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
    { label: "Total Robots", value: fleetCounts.total, icon: Bot },
    { label: "Idle", value: fleetCounts.idle, icon: CircleDashed },
    { label: "Working", value: fleetCounts.working, icon: Activity },
    { label: "Charging", value: fleetCounts.charging, icon: BatteryCharging },
    { label: "Error", value: fleetCounts.error, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="relative p-5 sm:p-10">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[2.6rem] bg-accent/10" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unified Fleet Surface</p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-3xl">
              Operate <span className="accent-word">distributed</span> AMR systems in one calm console.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Canonical state, vendor payload credibility, and role-bound command controls aligned in a single
              operational plane.
            </p>
          </CardContent>
        </Card>
      </motion.section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {loading && robots.length === 0
          ? Array.from({ length: 5 }, (_, index) => (
              <Card key={`kpi-skeleton-${index}`}>
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-1 w-full rounded-full" />
                </CardContent>
              </Card>
            ))
          : statCards.map((card) => (
              <KpiCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
            ))}
      </section>

      <Card>
        <CardHeader className="space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl">Fleet View</CardTitle>
              <CardDescription>Click a robot row to open detail. Status and location update every 3 seconds.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Store: {storeMode === "kv" ? "Vercel KV" : "In-memory fallback"}
              </Badge>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-accent-foreground">
                <motion.span
                  className="h-2 w-2 rounded-full bg-accent"
                  animate={prefersReducedMotion ? {} : { opacity: [0.35, 1, 0.35], scale: [1, 1.22, 1] }}
                  transition={prefersReducedMotion ? undefined : { duration: 1.4, repeat: Infinity }}
                />
                Polling every 3s
              </span>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <Select value={vendorFilter} onValueChange={(value) => setVendorFilter(value as typeof vendorFilter)}>
              <SelectTrigger className="h-10 rounded-full">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vendor: all</SelectItem>
                <SelectItem value="locus">Vendor: locus</SelectItem>
                <SelectItem value="vendor_b">Vendor: vendor_b</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="h-10 rounded-full">
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
              <SelectTrigger className="h-10 rounded-full">
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

            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <TabsList className="h-10 w-full justify-start rounded-full overflow-x-auto px-1 sm:justify-center">
                <TabsTrigger value="canonical" className="text-[11px] uppercase tracking-[0.08em]">
                  Canonical
                </TabsTrigger>
                <TabsTrigger value="locus" className="text-[11px] uppercase tracking-[0.08em]">
                  Locus
                </TabsTrigger>
                <TabsTrigger value="vendor_b" className="text-[11px] uppercase tracking-[0.08em]">
                  Vendor_B
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {error ? <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm">{error}</div> : null}

          {viewMode !== "canonical" ? (
            <Card className="border-dashed bg-card/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sample {viewMode} payload</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="max-h-80 overflow-auto rounded-2xl border bg-[hsl(30_19%_15%)] p-3 text-[11px] text-[hsl(41_38%_94%)] sm:p-4 sm:text-xs">
                  {samplePayload
                    ? JSON.stringify(samplePayload, null, 2)
                    : `No ${viewMode} robots in the current filtered result.`}
                </pre>
              </CardContent>
            </Card>
          ) : null}

          {loading && robots.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border">
              <Table className={viewMode === "canonical" ? "min-w-[980px]" : "min-w-[640px]"}>
                <TableHeader className="bg-muted/55">
                  <TableRow className="hover:translate-y-0 hover:bg-muted/55 hover:shadow-none">
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
                        "cursor-pointer bg-card/55",
                        changedRows.includes(robot.id) && "bg-accent/12 ring-1 ring-inset ring-accent/20",
                      )}
                      onClick={() => router.push(`/robots/${encodeURIComponent(robot.id)}`)}
                    >
                      <TableCell>
                        <Mono>{robot.id}</Mono>
                      </TableCell>
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
                          <TableCell>
                            <Mono>
                              ({robot.position.x.toFixed(1)}, {robot.position.y.toFixed(1)})
                            </Mono>
                          </TableCell>
                          <TableCell>
                            <Mono>{robot.currentTaskId ?? "-"}</Mono>
                          </TableCell>
                          <TableCell>{new Date(robot.lastSeen).toLocaleTimeString()}</TableCell>
                        </>
                      ) : (
                        <TableCell>
                          <Mono className="line-clamp-2 max-w-[360px] whitespace-normal text-[11px] text-muted-foreground">
                            {JSON.stringify(robot.rawPayload).slice(0, 220)}
                          </Mono>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredRobots.length === 0 ? (
                    <TableRow className="hover:translate-y-0 hover:bg-card hover:shadow-none">
                      <TableCell colSpan={viewMode === "canonical" ? 8 : 3} className="py-8 text-center text-muted-foreground">
                        No robots match current filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
