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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/leads", label: "Leads", icon: UserCheck },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart2 },
  { href: "/dashboard/proposals", label: "Proposals", icon: FileText },
  { href: "/dashboard/assets", label: "Assets", icon: FileImage },
  { href: "/dashboard/settings/connections", label: "Settings", icon: Settings },
];

const ADMIN_ITEMS = [
  { href: "/dashboard/admin", label: "Platform Admin", icon: Shield },
];

interface SidebarProps {
  userRole?: string;
  brandName?: string;
}

export function Sidebar({ userRole, brandName = "Rocket Radio" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const allNavItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-rocket-border bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-rocket-border px-6">
        <Rocket className="h-6 w-6 text-rocket-accent" />
        <span className="text-lg font-bold text-rocket-dark">{brandName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {allNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-rocket-blue/10 text-rocket-blue"
                  : "text-rocket-muted hover:bg-rocket-bg hover:text-rocket-dark",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-rocket-border p-4 space-y-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-rocket-muted transition-colors hover:bg-rocket-bg hover:text-rocket-dark"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        <p className="px-3 text-xs text-rocket-muted">
          Powered by Federated Media
        </p>
      </div>
    </aside>
  );
}
