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
      <Card className={cn("group h-full min-h-[168px] overflow-hidden border-border/80 sm:min-h-[176px]", className)}>
        <CardContent className="space-y-3 px-5 pb-5 pt-7 sm:space-y-4 sm:px-6 sm:pb-6 sm:pt-8">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <p className="text-[11px] uppercase leading-none tracking-[0.14em] text-muted-foreground sm:text-xs">
              {label}
            </p>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent-foreground sm:h-10 sm:w-10">
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          </div>
          <p className="text-[2.25rem] font-semibold leading-none tracking-tight text-foreground sm:text-5xl sm:leading-none">
            {value}
          </p>
          <div className="h-1 w-full rounded-full bg-muted">
            <div className="h-1 w-8 rounded-full bg-accent" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
