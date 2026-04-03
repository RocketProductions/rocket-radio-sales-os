"use client";

import { useState, useEffect, useCallback } from "react";

export type RoleView = "owner" | "admin" | "rep" | "client";

export interface RoleViewConfig {
  label: string;
  description: string;
  icon: string;
  showAllTenants: boolean;
  showAgents: boolean;
  showProspects: boolean;
  showAdmin: boolean;
  showPortal: boolean;
}

export const ROLE_VIEWS: Record<RoleView, RoleViewConfig> = {
  owner: {
    label: "Platform Owner",
    description: "All tenants, all data, all agents",
    icon: "Shield",
    showAllTenants: true,
    showAgents: true,
    showProspects: true,
    showAdmin: true,
    showPortal: false,
  },
  admin: {
    label: "Media Company Admin",
    description: "All reps and clients in your organization",
    icon: "Building2",
    showAllTenants: false,
    showAgents: true,
    showProspects: true,
    showAdmin: true,
    showPortal: false,
  },
  rep: {
    label: "Station Rep / AE",
    description: "Your assigned clients and pipeline only",
    icon: "Headphones",
    showAllTenants: false,
    showAgents: false,
    showProspects: true,
    showAdmin: false,
    showPortal: false,
  },
  client: {
    label: "Client / Business Owner",
    description: "Portal view — leads, ROI, campaign journey",
    icon: "Store",
    showAllTenants: false,
    showAgents: false,
    showProspects: false,
    showAdmin: false,
    showPortal: true,
  },
};

const STORAGE_KEY = "role-view";

export function useRoleSwitcher() {
  const [viewAs, setViewAsState] = useState<RoleView>("owner");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as RoleView | null;
    if (stored && stored in ROLE_VIEWS) {
      setViewAsState(stored);
    }
    setMounted(true);
  }, []);

  const setViewAs = useCallback((role: RoleView) => {
    setViewAsState(role);
    localStorage.setItem(STORAGE_KEY, role);
  }, []);

  const isSimulating = viewAs !== "owner";
  const permissions = ROLE_VIEWS[viewAs];

  return {
    viewAs: mounted ? viewAs : "owner" as RoleView,
    setViewAs,
    isSimulating,
    permissions,
    mounted,
  };
}
