"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";

interface DashboardShellProps {
  userRole?: string;
  brandName?: string;
  children: React.ReactNode;
}

export function DashboardShell({ userRole, brandName, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  // mounted prevents hydration mismatch — localStorage is browser-only
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read preference after first paint so server/client HTML match
    if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <ThemeProvider>
    <div className="flex h-screen overflow-hidden">
      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <Sidebar
        userRole={userRole}
        brandName={brandName}
        collapsed={mounted && collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapse}
      />

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} userRole={userRole} />
        <main className="flex-1 overflow-y-auto px-6 py-8">
          {children}
        </main>
      </div>
    </div>
    <AssistantWidget />
    </ThemeProvider>
  );
}
