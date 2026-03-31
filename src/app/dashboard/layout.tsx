import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { resolveBranding, brandingToCss } from "@/lib/branding";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Read tenant context injected by middleware
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id") ?? undefined;
  const userRole = headerStore.get("x-user-role") ?? undefined;

  // Resolve per-tenant branding (falls back to Rocket Radio defaults)
  const branding = await resolveBranding(tenantId);

  return (
    <>
      {/* Inject per-tenant CSS variable overrides */}
      {(branding.primaryColor !== "#1B2B4B" || branding.accentColor !== "#E53935") && (
        <style dangerouslySetInnerHTML={{ __html: brandingToCss(branding) }} />
      )}

      <div className="flex h-screen overflow-hidden">
        <Sidebar userRole={userRole} brandName={branding.brandName} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
