import { headers } from "next/headers";
import { Rocket } from "lucide-react";
import { resolveBranding, brandingToCss, getTenantIdFromCookie } from "@/lib/branding";

/**
 * Client Portal Layout
 *
 * What the $49+/mo client sees. Intentionally simple.
 * White-labeled: shows the tenant's brand name (or "Your Leads" by default).
 * No sidebar complexity. No feature overload.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const tenantId =
    headerStore.get("x-tenant-id") ??
    (await getTenantIdFromCookie()) ??
    undefined;

  const branding = await resolveBranding(tenantId);

  return (
    <>
      {(branding.primaryColor !== "#1B2B4B" || branding.accentColor !== "#E53935") && (
        <style dangerouslySetInnerHTML={{ __html: brandingToCss(branding) }} />
      )}

      <div className="min-h-screen bg-rocket-bg">
        {/* Simple header */}
        <header className="border-b border-rocket-border bg-white">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-rocket-accent" />
              <span className="font-semibold text-rocket-dark">Your Leads</span>
            </div>
            {!branding.hideRocketBranding && (
              <span className="text-sm text-rocket-muted">
                Powered by {branding.brandName}
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-4xl px-6 py-8">
          {children}
        </main>
      </div>
    </>
  );
}
