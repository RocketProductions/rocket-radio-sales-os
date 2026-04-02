import { headers } from "next/headers";
import { resolveBranding, brandingToCss, getTenantIdFromCookie } from "@/lib/branding";
import { PortalSignOutButton } from "@/components/portal/PortalSignOutButton";
import { PortalThemeWrapper } from "@/components/portal/PortalThemeWrapper";

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

      <PortalThemeWrapper>
      <div className="min-h-screen bg-rocket-bg">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-rocket-border bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Rocket Radio" className="h-6 w-6 rounded" />
              <span className="text-sm font-semibold text-rocket-dark">Your Leads</span>
            </div>
            <div className="flex items-center gap-4">
              {!branding.hideRocketBranding && (
                <span className="text-xs text-rocket-muted hidden sm:block">
                  Powered by {branding.brandName}
                </span>
              )}
              <PortalSignOutButton />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-5xl px-6 py-8">
          {children}
        </main>
      </div>
      </PortalThemeWrapper>
    </>
  );
}
