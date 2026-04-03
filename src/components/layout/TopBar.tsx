"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Shield, Building2, Headphones, Store, ChevronDown } from "lucide-react";
import { useRoleSwitcher, ROLE_VIEWS, type RoleView } from "@/hooks/useRoleSwitcher";

const ROLE_ICONS: Record<RoleView, React.ComponentType<{ className?: string }>> = {
  owner: Shield,
  admin: Building2,
  rep: Headphones,
  client: Store,
};

interface TopBarProps {
  onMenuClick?: () => void;
  userRole?: string;
}

export function TopBar({ onMenuClick, userRole }: TopBarProps) {
  const { viewAs, setViewAs } = useRoleSwitcher();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = userRole === "super_admin";
  const currentConfig = ROLE_VIEWS[viewAs];
  const CurrentIcon = ROLE_ICONS[viewAs];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-rocket-border bg-rocket-card/80 backdrop-blur-md px-4 md:px-6">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="rounded-lg p-1.5 text-rocket-muted hover:bg-rocket-bg hover:text-rocket-dark md:hidden transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <span className="text-[13px] font-medium text-rocket-muted">
            Federated Media &middot; 95.3 MNC
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* ── Role Switcher (super_admin only) ──────────────────────────── */}
          {isSuperAdmin && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg border border-rocket-border bg-rocket-bg/60 px-3 py-1.5 text-[12px] font-medium text-rocket-muted hover:border-rocket-gold/40 hover:text-rocket-dark transition-colors"
              >
                <CurrentIcon className="h-3.5 w-3.5" />
                <span>{currentConfig.label}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-rocket-border bg-rocket-card shadow-xl shadow-black/20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-rocket-border">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-rocket-muted/60">
                      View as role
                    </p>
                  </div>

                  {(Object.keys(ROLE_VIEWS) as RoleView[]).map((key) => {
                    const config = ROLE_VIEWS[key];
                    const Icon = ROLE_ICONS[key];
                    const isActive = viewAs === key;

                    return (
                      <button
                        key={key}
                        onClick={() => { setViewAs(key); setOpen(false); }}
                        className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? "bg-rocket-gold/10"
                            : "hover:bg-rocket-bg/60"
                        }`}
                      >
                        <div className={`mt-0.5 rounded-md p-1.5 ${
                          isActive
                            ? "bg-rocket-gold/20 text-rocket-gold"
                            : "bg-rocket-bg text-rocket-muted"
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-medium ${
                              isActive ? "text-rocket-gold" : "text-rocket-dark"
                            }`}>
                              {config.label}
                            </span>
                            {isActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-rocket-gold" />
                            )}
                          </div>
                          <p className="text-[11px] text-rocket-muted mt-0.5 leading-snug">
                            {config.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* User avatar placeholder */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rocket-blue/10 text-xs font-semibold text-rocket-blue">
            CA
          </div>
        </div>
      </header>

      {/* ── Client portal banner ──────────────────────────────────────────── */}
      {isSuperAdmin && viewAs === "client" && (
        <div className="flex items-center gap-2 bg-rocket-gold/10 border-b border-rocket-gold/20 px-4 py-1.5">
          <Store className="h-3.5 w-3.5 text-rocket-gold" />
          <span className="text-[12px] font-medium text-rocket-gold">
            Viewing as client — portal experience
          </span>
        </div>
      )}
    </>
  );
}
