"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-rocket-border bg-white px-6">
      <div>
        <h2 className="text-sm font-medium text-rocket-muted">
          Federated Media &middot; 95.3 MNC
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="text-rocket-muted">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
