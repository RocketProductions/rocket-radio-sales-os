import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Super-Admin Tenant Dashboard
 *
 * Lists all tenants across the platform.
 * Only accessible to users with role = "admin" or "super_admin".
 * The middleware enforces this — this page just shows the data.
 */
export default async function AdminPage() {
  let tenants: Array<{
    id: string;
    name: string;
    slug: string;
    planTier: string;
    createdAt: Date;
    _count: { users: number; brands: number };
    subscription: { status: string; plan: string } | null;
  }> = [];

  let totalLeads = 0;
  let totalCampaigns = 0;

  try {
    [tenants, totalLeads, totalCampaigns] = await Promise.all([
      prisma.tenant.findMany({
        include: {
          _count: { select: { users: true, brands: true } },
          subscription: { select: { status: true, plan: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count(),
      prisma.campaign.count(),
    ]);
  } catch {
    // DB not connected
  }

  const PLAN_COLORS: Record<string, string> = {
    starter: "bg-blue-50 text-blue-700 border-blue-200",
    growth: "bg-purple-50 text-purple-700 border-purple-200",
    scale: "bg-rocket-success/10 text-rocket-success border-rocket-success/20",
    trialing: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };

  const SUB_STATUS_COLORS: Record<string, string> = {
    active: "bg-rocket-success/10 text-rocket-success border-rocket-success/20",
    trialing: "bg-yellow-50 text-yellow-700 border-yellow-200",
    past_due: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-rocket-muted/10 text-rocket-muted border-rocket-muted/20",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-rocket-accent" />
        <div>
          <h1 className="text-2xl font-bold">Platform Admin</h1>
          <p className="text-sm text-rocket-muted">All tenants across the platform.</p>
        </div>
      </div>

      {/* ─── Platform Stats ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Tenants", value: tenants.length },
          { label: "Active Subscriptions", value: tenants.filter((t) => t.subscription?.status === "active").length },
          { label: "Total Campaigns", value: totalCampaigns },
          { label: "Total Leads", value: totalLeads },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-rocket-border bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-rocket-muted">{label}</p>
            <p className="mt-1 text-3xl font-bold text-rocket-dark">{value}</p>
          </div>
        ))}
      </div>

      {/* ─── Tenant Table ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="py-8 text-center text-sm text-rocket-muted">No tenants yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rocket-border text-left">
                    <th className="pb-2 pr-4 font-medium text-rocket-muted">Tenant</th>
                    <th className="pb-2 pr-4 font-medium text-rocket-muted">Plan</th>
                    <th className="pb-2 pr-4 font-medium text-rocket-muted">Subscription</th>
                    <th className="pb-2 pr-4 text-right font-medium text-rocket-muted">Users</th>
                    <th className="pb-2 text-right font-medium text-rocket-muted">Brands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rocket-border">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-rocket-bg/50">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-rocket-dark">{t.name}</p>
                        <p className="text-xs text-rocket-muted">{t.slug}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className={`text-xs ${PLAN_COLORS[t.planTier] ?? ""}`}
                        >
                          {t.planTier}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {t.subscription ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${SUB_STATUS_COLORS[t.subscription.status] ?? ""}`}
                          >
                            {t.subscription.status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-rocket-muted">no subscription</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-rocket-dark">
                        {t._count.users}
                      </td>
                      <td className="py-3 text-right text-rocket-dark">
                        {t._count.brands}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
