import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type MonoTag = "span" | "code" | "p" | "div";

interface MonoProps extends HTMLAttributes<HTMLElement> {
  as?: MonoTag;
}

export function Mono({ as = "span", className, ...props }: MonoProps) {
  const Comp = as;
  return (
    <Comp
      className={cn(
        "font-mono text-[12px] tracking-[0.03em] text-foreground/90 sm:text-[13px]",
        className,
      )}
      {...props}
    />
  );
}
