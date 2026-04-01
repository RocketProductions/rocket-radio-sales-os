"use client";

import { Menu } from "lucide-react";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-rocket-border bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-1.5 text-rocket-muted hover:bg-rocket-bg hover:text-rocket-dark md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <h2 className="text-sm font-medium text-rocket-muted">
          Federated Media &middot; 95.3 MNC
        </h2>
      </div>
    </header>
  );
}
