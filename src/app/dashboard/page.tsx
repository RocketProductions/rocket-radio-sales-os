import { headers } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadStatusUpdater } from "@/components/leads/LeadStatusUpdater";
import { Badge } from "@/components/ui/badge";
import {
  Users, Megaphone, UserCheck, TrendingUp, ChevronRight, CalendarCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

type LpLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  landing_pages: {
    business_name: string | null;
    session_id: string | null;
  } | null;
};

export default async function DashboardPage() {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id") ?? "";
  const userRole    = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

  // Pull recent leads with landing page context
  const { data: rawLeads } = await supabase
    .from("lp_leads")
    .select(`
      id, name, email, phone, status, created_at,
      landing_pages ( business_name, session_id )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  let leads = (rawLeads ?? []) as unknown as LpLead[];

  // Tenant filter (same pattern as leads page)
  if (!isSuperAdmin && tenantId && leads.length > 0) {
    const sessionIds = leads
      .map((l) => l.landing_pages?.session_id)
      .filter(Boolean) as string[];

    if (sessionIds.length > 0) {
      const { data: tenantSessions } = await supabase
        .from("campaign_sessions")
        .select("session_id")
        .eq("tenant_id", tenantId)
        .in("session_id", sessionIds);

      const allowed = new Set(
        (tenantSessions ?? []).map((s: { session_id: string }) => s.session_id),
      );
      leads = leads.filter(
        (l) => !l.landing_pages?.session_id || allowed.has(l.landing_pages.session_id),
      );
    }
  }

  // Pull active campaign sessions for this tenant
  const campaignQuery = supabase
    .from("campaign_sessions")
    .select("id, business_name, status, created_at")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && tenantId) {
    campaignQuery.eq("tenant_id", tenantId);
  }

  const { data: campaignSessions } = await campaignQuery.limit(100);
  const campaigns = campaignSessions ?? [];
  const activeCampaigns = campaigns.filter(
    (c: { status: string }) => c.status === "active" || c.status === "published",
  );

  // Compute stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const leadsThisMonth = leads.filter((l) => l.created_at >= startOfMonth);

  const stats = {
    activeCampaigns: activeCampaigns.length,
    totalLeads: leadsThisMonth.length,
    clients: new Set(
      leads
        .map((l) => l.landing_pages?.business_name)
        .filter(Boolean),
    ).size,
    booked: leads.filter((l) => l.status === "booked" || l.status === "closed").length,
  };

  const recentLeads = leads.slice(0, 12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-rocket-muted">
          Your campaigns, leads, and client activity at a glance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rocket-muted">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-rocket-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-rocket-muted">
              {campaigns.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rocket-muted">Leads This Month</CardTitle>
            <UserCheck className="h-4 w-4 text-rocket-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-rocket-muted">
              {leads.length} all time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rocket-muted">Clients</CardTitle>
            <Users className="h-4 w-4 text-rocket-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.clients}</div>
            <p className="text-xs text-rocket-muted">With leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rocket-muted">Booked / Closed</CardTitle>
            <CalendarCheck className="h-4 w-4 text-rocket-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.booked}</div>
            <p className="text-xs text-rocket-muted">
              {leads.length > 0
                ? `${Math.round((stats.booked / leads.length) * 100)}% close rate`
                : "No leads yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Leads</CardTitle>
            <Link
              href="/dashboard/leads"
              className="text-xs text-rocket-muted hover:text-rocket-blue transition-colors"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <UserCheck className="mb-3 h-10 w-10 text-rocket-border" />
                <p className="text-sm font-medium">No leads yet</p>
                <p className="mt-1 text-xs text-rocket-muted">
                  Leads appear here when someone fills out a landing page form.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-md border border-rocket-border p-3 gap-3 hover:bg-slate-50 transition-colors group"
                  >
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="min-w-0 flex-1 flex items-center gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-rocket-dark truncate group-hover:text-rocket-blue transition-colors">
                          {lead.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-rocket-muted truncate">
                          {lead.landing_pages?.business_name ?? "—"} &middot;{" "}
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-rocket-blue shrink-0 transition-colors" />
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <LeadStatusBadge status={lead.status} />
                      <LeadStatusUpdater leadId={lead.id} currentStatus={lead.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Campaigns</CardTitle>
            <Link
              href="/dashboard/campaigns"
              className="text-xs text-rocket-muted hover:text-rocket-blue transition-colors"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Megaphone className="mb-3 h-10 w-10 text-rocket-border" />
                <p className="text-sm font-medium">No campaigns yet</p>
                <p className="mt-1 text-xs text-rocket-muted">
                  Create your first campaign to start generating leads.
                </p>
                <Link href="/dashboard/campaigns/new">
                  <Badge variant="outline" className="mt-3 cursor-pointer hover:bg-slate-50">
                    + New Campaign
                  </Badge>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.slice(0, 10).map((c: { id: string; business_name: string; status: string; created_at: string }) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border border-rocket-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-rocket-dark truncate">
                        {c.business_name}
                      </p>
                      <p className="text-xs text-rocket-muted">
                        {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        c.status === "active" || c.status === "published"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-slate-200 text-slate-500"
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outcome summary */}
      {leads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["new", "contacted", "booked", "closed"] as const).map((status) => {
                const count = leads.filter((l) => l.status === status).length;
                const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                return (
                  <div key={status} className="rounded-lg border border-rocket-border p-3 text-center">
                    <LeadStatusBadge status={status} />
                    <p className="mt-2 text-2xl font-bold">{count}</p>
                    <p className="text-xs text-rocket-muted">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
