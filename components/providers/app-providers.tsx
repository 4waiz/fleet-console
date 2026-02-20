"use client";

import { Toaster } from "sonner";
import { RoleProvider } from "@/components/providers/role-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      {children}
      <Toaster
        closeButton
        position="top-right"
        toastOptions={{
          className:
            "border border-border bg-card text-card-foreground shadow-lg rounded-2xl",
        }}
      />
    </RoleProvider>
  );
}
