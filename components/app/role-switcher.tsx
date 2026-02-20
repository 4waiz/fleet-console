"use client";

import type { ComponentType } from "react";
import { ShieldCheck, ShieldEllipsis, ShieldOff } from "lucide-react";
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

const roleOptions: { role: Role; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { role: "viewer", label: "Viewer", icon: ShieldOff },
  { role: "operator", label: "Operator", icon: ShieldEllipsis },
  { role: "admin", label: "Admin", icon: ShieldCheck },
];

function roleBadgeVariant(role: Role): "outline" | "secondary" | "default" {
  if (role === "admin") {
    return "default";
  }
  if (role === "operator") {
    return "secondary";
  }
  return "outline";
}

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const active = roleOptions.find((item) => item.role === role) ?? roleOptions[0];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ActiveIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Role</span>
          <Badge variant={roleBadgeVariant(role)} className="font-semibold uppercase tracking-wide">
            {role}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roleOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.role}
              className="cursor-pointer justify-between"
              onSelect={() => setRole(option.role)}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {option.label}
              </span>
              {role === option.role ? <Badge variant="secondary">Active</Badge> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
