"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  className?: string;
}

export function KpiCard({ label, value, icon: Icon, className }: KpiCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className={cn("group overflow-hidden border-border/80", className)}>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent-foreground">
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <div className="h-1 w-full rounded-full bg-muted">
            <div className="h-1 w-8 rounded-full bg-accent" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
