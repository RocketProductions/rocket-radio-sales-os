"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  UserCheck,
  BarChart2,
  FileText,
  Shield,
  LogOut,
  Rocket,
  FileImage,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",                        label: "Dashboard",      icon: LayoutDashboard },
  { href: "/dashboard/campaigns",              label: "Campaigns",      icon: Megaphone },
  { href: "/dashboard/clients",                label: "Clients",        icon: Users },
  { href: "/dashboard/leads",                  label: "Leads",          icon: UserCheck },
  { href: "/dashboard/reports",                label: "Reports",        icon: BarChart2 },
  { href: "/dashboard/proposals",              label: "Proposals",      icon: FileText },
  { href: "/dashboard/assets",                 label: "Assets",         icon: FileImage },
  { href: "/dashboard/settings/connections",   label: "Settings",       icon: Settings },
];

const ADMIN_ITEMS = [
  { href: "/dashboard/admin", label: "Platform Admin", icon: Shield },
];

interface SidebarProps {
  userRole?: string;
  brandName?: string;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  userRole,
  brandName = "Rocket Radio",
  collapsed = false,
  mobileOpen = false,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const isAdmin  = userRole === "admin" || userRole === "super_admin";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const allNavItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-rocket-border bg-white",
        "fixed inset-y-0 left-0 z-30 transition-all duration-200 ease-in-out",
        "md:sticky md:top-0 md:z-auto md:translate-x-0",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        collapsed ? "w-64 md:w-[60px]" : "w-64",
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-14 shrink-0 items-center border-b border-rocket-border",
        collapsed ? "px-0 justify-center" : "px-4 gap-2.5"
      )}>
        <div className={cn(
          "flex items-center justify-center rounded-lg bg-rocket-accent/10",
          collapsed ? "h-8 w-8" : "h-8 w-8"
        )}>
          <Rocket className="h-4 w-4 shrink-0 text-rocket-accent" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-rocket-dark">{brandName}</span>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              "ml-auto rounded-lg p-1.5 text-rocket-muted hover:bg-rocket-bg hover:text-rocket-dark md:hidden transition-colors",
              collapsed && "hidden"
            )}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto py-3 px-2">
        {allNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium transition-all duration-150",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-rocket-blue/8 text-rocket-blue shadow-sm shadow-rocket-blue/5"
                  : "text-rocket-muted hover:bg-rocket-bg hover:text-rocket-dark",
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-rocket-blue" : "text-rocket-muted group-hover:text-rocket-dark"
              )} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-rocket-border py-3 px-2 space-y-0.5">
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg py-2 text-[13px] font-medium text-rocket-muted transition-all duration-150 hover:bg-rocket-bg hover:text-rocket-dark",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0 group-hover:text-rocket-dark transition-colors" />
          {!collapsed && "Sign out"}
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden md:flex w-full items-center gap-3 rounded-lg py-2 text-[13px] font-medium text-rocket-muted transition-all duration-150 hover:bg-rocket-bg hover:text-rocket-dark",
              collapsed ? "justify-center px-0" : "px-3"
            )}
          >
            {collapsed
              ? <PanelLeftOpen  className="h-4 w-4 shrink-0" />
              : <PanelLeftClose className="h-4 w-4 shrink-0" />
            }
            {!collapsed && <span>Collapse</span>}
          </button>
        )}

        {!collapsed && (
          <p className="px-3 pt-2 text-[11px] text-rocket-muted/60">
            Powered by Federated Media
          </p>
        )}
      </div>
    </aside>
  );
}
