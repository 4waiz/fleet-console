"use client";

import { Toaster } from "sonner";
import { RoleProvider } from "@/components/providers/role-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      {children}
      <Toaster richColors closeButton position="top-right" />
    </RoleProvider>
  );
}
