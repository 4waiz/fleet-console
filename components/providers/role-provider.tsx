"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Role } from "@/lib/types";

const ROLE_STORAGE_KEY = "fleet_console_role";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("viewer");

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (stored === "viewer" || stored === "operator" || stored === "admin") {
      setRole(stored);
    }
  }, []);

  const updateRole = (nextRole: Role) => {
    setRole(nextRole);
    window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
  };

  const value = useMemo(
    () => ({
      role,
      setRole: updateRole,
    }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
}
