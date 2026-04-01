import { headers } from "next/headers";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { resolveBranding, brandingToCss } from "@/lib/branding";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id") ?? undefined;
  const userRole = headerStore.get("x-user-role") ?? undefined;

  const branding = await resolveBranding(tenantId);

  return (
    <>
      {(branding.primaryColor !== "#1B2B4B" || branding.accentColor !== "#E53935") && (
        <style dangerouslySetInnerHTML={{ __html: brandingToCss(branding) }} />
      )}

      <DashboardShell userRole={userRole} brandName={branding.brandName}>
        {children}
      </DashboardShell>
    </>
  );
}
