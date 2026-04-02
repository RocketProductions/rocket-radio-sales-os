"use client";

import { Menu } from "lucide-react";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
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

      {/* User avatar placeholder */}
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rocket-blue/10 text-xs font-semibold text-rocket-blue">
        CA
      </div>
    </header>
  );
}
