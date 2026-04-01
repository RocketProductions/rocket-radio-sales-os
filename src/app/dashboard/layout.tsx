import { headers } from "next/headers";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SubscriptionBanner } from "@/components/layout/SubscriptionBanner";
import { resolveBranding, brandingToCss } from "@/lib/branding";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id") ?? undefined;
  const userRole = headerStore.get("x-user-role") ?? undefined;

  const [branding, subData] = await Promise.all([
    resolveBranding(tenantId),
    tenantId
      ? getSupabaseAdmin()
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("tenant_id", tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const sub = subData?.data as { status: string; current_period_end: string | null } | null;

  return (
    <>
      {(branding.primaryColor !== "#1B2B4B" || branding.accentColor !== "#E53935") && (
        <style dangerouslySetInnerHTML={{ __html: brandingToCss(branding) }} />
      )}

      {sub && sub.status !== "active" && sub.status !== "trialing" && (
        <SubscriptionBanner status={sub.status} currentPeriodEnd={sub.current_period_end} />
      )}

      <DashboardShell userRole={userRole} brandName={branding.brandName}>
        {children}
      </DashboardShell>
    </>
  );
}
