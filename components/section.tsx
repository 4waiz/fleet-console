import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  id?: string;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function Section({ id, className, title, description, action, children }: SectionProps) {
  return (
    <section id={id} className={cn("space-y-6 py-1 sm:space-y-8", className)}>
      {title || description || action ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            {title ? (
              <h1 className="text-[clamp(1.8rem,4vw,2.7rem)] font-semibold tracking-[-0.02em] text-foreground">
                {title}
              </h1>
            ) : null}
            {description ? <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
