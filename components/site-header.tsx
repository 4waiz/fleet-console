"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, ShieldCheck, ShieldEllipsis, ShieldOff } from "lucide-react";
import { useRole } from "@/components/providers/role-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/dispatch", label: "Dispatch" },
  { href: "/audit", label: "Audit" },
  { href: "/api-docs", label: "API Docs" },
];

const roleConfig: Record<
  Role,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  viewer: {
    label: "Viewer",
    icon: ShieldOff,
    className: "border-border bg-card text-muted-foreground",
  },
  operator: {
    label: "Operator",
    icon: ShieldEllipsis,
    className: "border-accent/30 bg-accent/10 text-accent-foreground",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    className: "border-primary/20 bg-primary text-primary-foreground",
  },
};

function RoleChip() {
  const { role, setRole } = useRole();
  const current = roleConfig[role];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Active role ${role}`}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-11 sm:gap-2 sm:px-3.5 sm:text-xs",
            current.className,
          )}
        >
          <CurrentIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{role}</span>
          <ChevronDown className="hidden h-3.5 w-3.5 opacity-70 sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Active Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(roleConfig) as Role[]).map((roleItem) => {
          const Icon = roleConfig[roleItem].icon;
          return (
            <DropdownMenuItem
              key={roleItem}
              className="cursor-pointer justify-between"
              onSelect={() => setRole(roleItem)}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {roleConfig[roleItem].label}
              </span>
              {role === roleItem ? <Badge variant="secondary">Active</Badge> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Fleet Console";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent transition-all duration-300",
        scrolled
          ? "border-border/80 bg-background/92 shadow-[0_16px_30px_-26px_rgba(24,16,10,0.6)] backdrop-blur-xl"
          : "bg-background/65 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:h-20 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="inline-flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-accent/35 bg-accent/10 sm:h-10 sm:w-10">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">{appName}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            asChild
            className="hidden md:inline-flex"
          >
            <a href="mailto:hello@fleet-console.demo">Request Access</a>
          </Button>
          <RoleChip />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-10 w-10 lg:hidden" aria-label="Open navigation menu">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Navigate</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navLinks.map((link) => (
                <DropdownMenuItem asChild key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="mailto:hello@fleet-console.demo">Request Access</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
