import { Rocket } from "lucide-react";

/**
 * Client Portal Layout
 *
 * This is what the $49/mo client sees. It is intentionally simple.
 * No sidebar complexity. No feature overload.
 * Just: "Your Leads" and what's happening with them.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-rocket-bg">
      {/* Simple header */}
      <header className="border-b border-rocket-border bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-rocket-accent" />
            <span className="font-semibold text-rocket-dark">Your Leads</span>
          </div>
          <span className="text-sm text-rocket-muted">Powered by Rocket Radio</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
