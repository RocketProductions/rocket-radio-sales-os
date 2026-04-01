import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Super-Admin Tenant Dashboard
 * Lists all tenants across the platform.
 * Only accessible to users with role = "admin" or "super_admin".
 */
export default async function AdminPage() {
  const supabase = getSupabaseAdmin();

  // Fetch all tenants with subscription info
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, plan_tier, created_at")
    .order("created_at", { ascending: false });

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("tenant_id, status, plan");

  const { data: appUsers } = await supabase
    .from("app_users")
    .select("tenant_id");

  // Counts from real tables
  const { count: totalLeads }     = await supabase.from("lp_leads").select("*", { count: "exact", head: true });
  const { count: totalCampaigns } = await supabase.from("campaign_sessions").select("*", { count: "exact", head: true });

  type Tenant     = { id: string; name: string; slug: string; plan_tier: string; created_at: string };
  type Sub        = { tenant_id: string; status: string; plan: string };
  type AppUser    = { tenant_id: string | null };

  const subByTenantId = Object.fromEntries(
    (subscriptions ?? []).map((s: Sub) => [s.tenant_id, s])
  );
  const userCountByTenantId = (appUsers ?? []).reduce<Record<string, number>>((acc, u: AppUser) => {
    if (u.tenant_id) acc[u.tenant_id] = (acc[u.tenant_id] ?? 0) + 1;
    return acc;
  }, {});

  const PLAN_COLORS: Record<string, string> = {
    starter:  "bg-blue-50 text-blue-700 border-blue-200",
    growth:   "bg-purple-50 text-purple-700 border-purple-200",
    scale:    "bg-rocket-success/10 text-rocket-success border-rocket-success/20",
    trialing: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };

  const SUB_STATUS_COLORS: Record<string, string> = {
    active:    "bg-rocket-success/10 text-rocket-success border-rocket-success/20",
    trialing:  "bg-yellow-50 text-yellow-700 border-yellow-200",
    past_due:  "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-rocket-muted/10 text-rocket-muted border-rocket-muted/20",
  };

  const tenantList = (tenants ?? []) as Tenant[];
  const activeSubscriptions = tenantList.filter((t) => subByTenantId[t.id]?.status === "active").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-rocket-accent" />
        <div>
          <h1 className="text-2xl font-bold">Platform Admin</h1>
          <p className="text-sm text-rocket-muted">All tenants across the platform.</p>
        </div>
      </div>

      {/* ─── Platform Stats ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Tenants",         value: tenantList.length },
          { label: "Active Subscriptions",  value: activeSubscriptions },
          { label: "Total Campaigns",       value: totalCampaigns ?? 0 },
          { label: "Total Leads",           value: totalLeads ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-rocket-border bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-rocket-muted">{label}</p>
            <p className="mt-1 text-3xl font-bold text-rocket-dark">{value}</p>
          </div>
        ))}
      </div>

      {/* ─── Tenant Table ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenantList.length === 0 ? (
            <p className="py-8 text-center text-sm text-rocket-muted">No tenants yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rocket-border text-left">
                    <th className="pb-2 pr-4 font-medium text-rocket-muted">Tenant</th>
                    <th className="pb-2 pr-4 font-medium text-rocket-muted">Plan</th>
                    <th className="pb-2 pr-4 font-medium text-rocket-muted">Subscription</th>
                    <th className="pb-2 text-right font-medium text-rocket-muted">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rocket-border">
                  {tenantList.map((t) => {
                    const sub = subByTenantId[t.id];
                    return (
                      <tr key={t.id} className="hover:bg-rocket-bg/50">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-rocket-dark">{t.name}</p>
                          <p className="text-xs text-rocket-muted">{t.slug}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={`text-xs ${PLAN_COLORS[t.plan_tier] ?? ""}`}
                          >
                            {t.plan_tier}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {sub ? (
                            <Badge
                              variant="outline"
                              className={`text-xs ${SUB_STATUS_COLORS[sub.status] ?? ""}`}
                            >
                              {sub.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-rocket-muted">no subscription</span>
                          )}
                        </td>
                        <td className="py-3 text-right text-rocket-dark">
                          {userCountByTenantId[t.id] ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
