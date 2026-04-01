"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function PortalSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-sm text-rocket-muted hover:text-rocket-dark transition-colors"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  );
}
