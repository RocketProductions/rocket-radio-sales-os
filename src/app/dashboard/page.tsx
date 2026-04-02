import { headers } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadStatusUpdater } from "@/components/leads/LeadStatusUpdater";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Users, Megaphone, UserCheck, ChevronRight, CalendarCheck, Inbox, Plus,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ClientAlert = {
  id: string;
  campaign_session_id: string;
  alert_type: string;
  severity: string;
  message: string;
  recommendation: string | null;
  created_at: string;
  business_name?: string;
};

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

  const { data: rawLeads } = await supabase
    .from("lp_leads")
    .select(`
      id, name, email, phone, status, created_at,
      landing_pages ( business_name, session_id )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  let leads = (rawLeads ?? []) as unknown as LpLead[];

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

  // Fetch unresolved client alerts
  const { data: rawAlerts } = await supabase
    .from("client_alerts")
    .select("id, campaign_session_id, alert_type, severity, message, recommendation, created_at")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(5);

  const campaignQuery = supabase
    .from("campaign_sessions")
    .select("id, business_name, status, created_at, session_id")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && tenantId) {
    campaignQuery.eq("tenant_id", tenantId);
  }

  const { data: campaignSessions } = await campaignQuery.limit(100);
  const campaigns = campaignSessions ?? [];

  // Enrich alerts with business names from campaign_sessions
  const sessionNameMap = new Map(
    campaigns.map((c: { session_id?: string; business_name: string }) => [c.session_id, c.business_name]),
  );
  const alerts: ClientAlert[] = (rawAlerts ?? []).map((a) => ({
    ...(a as ClientAlert),
    business_name: sessionNameMap.get(a.campaign_session_id as string) ?? "Unknown Client",
  }));

  const activeCampaigns = campaigns.filter(
    (c: { status: string }) => c.status === "active" || c.status === "published",
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const leadsThisMonth = leads.filter((l) => l.created_at >= startOfMonth);

  const stats = {
    activeCampaigns: activeCampaigns.length,
    totalLeads: leadsThisMonth.length,
    clients: new Set(
      leads.map((l) => l.landing_pages?.business_name).filter(Boolean),
    ).size,
    booked: leads.filter((l) => l.status === "booked" || l.status === "closed").length,
  };

  const recentLeads = leads.slice(0, 12);

  const statCards = [
    { label: "Active Campaigns", value: stats.activeCampaigns, sub: `${campaigns.length} total`,                                        icon: Megaphone,     color: "bg-rocket-blue" },
    { label: "Leads This Month", value: stats.totalLeads,      sub: `${leads.length} all time`,                                          icon: UserCheck,     color: "bg-indigo-500" },
    { label: "Clients",          value: stats.clients,         sub: "With leads",                                                        icon: Users,         color: "bg-rocket-success-bright" },
    { label: "Booked / Closed",  value: stats.booked,          sub: leads.length > 0 ? `${Math.round((stats.booked / leads.length) * 100)}% close rate` : "No leads yet", icon: CalendarCheck, color: "bg-rocket-accent-bright" },
  ];

  // Funnel data
  const funnel = ["new", "contacted", "booked", "closed"].map((status) => ({
    status,
    count: leads.filter((l) => l.status === status).length,
    pct: leads.length > 0 ? Math.round((leads.filter((l) => l.status === status).length / leads.length) * 100) : 0,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Your campaigns, leads, and client activity at a glance."
      />

      {/* Unresolved Client Alerts */}
      {alerts.length > 0 && (
        <Card
          className={`animate-fade-in-up ${
            alerts.some((a) => a.severity === "critical")
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base font-semibold">
                Campaigns Need Attention
              </CardTitle>
              <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 text-xs">
                {alerts.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 ${
                  alert.severity === "critical"
                    ? "border-red-200 bg-white"
                    : "border-amber-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-rocket-dark">
                      {alert.business_name}
                    </p>
                    <p className="mt-0.5 text-sm text-rocket-muted">{alert.message}</p>
                    {alert.recommendation && (
                      <p className="mt-1.5 text-xs italic text-rocket-muted/80">
                        {alert.recommendation}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      alert.severity === "critical"
                        ? "shrink-0 border-red-200 bg-red-50 text-red-700 text-xs"
                        : "shrink-0 border-amber-200 bg-amber-50 text-amber-700 text-xs"
                    }
                  >
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        {statCards.map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <div className={`absolute inset-y-0 left-0 w-1 ${s.color}`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 pl-5">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-rocket-muted">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-rocket-muted/60" />
            </CardHeader>
            <CardContent className="pl-5">
              <div className="text-3xl font-bold tracking-tight">{s.value}</div>
              <p className="mt-0.5 text-xs text-rocket-muted">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Leads */}
        <Card className="lg:col-span-3 animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
            <Link
              href="/dashboard/leads"
              className="text-xs font-medium text-rocket-muted hover:text-rocket-blue transition-colors"
            >
              View all &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rocket-border/40">
                  <Inbox className="h-6 w-6 text-rocket-muted/60" />
                </div>
                <p className="text-sm font-medium">No leads yet</p>
                <p className="mt-1 max-w-[240px] text-xs text-rocket-muted">
                  Leads appear here when someone fills out a landing page form.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="group flex items-center justify-between rounded-lg border border-transparent p-3 gap-3 transition-all duration-150 hover:border-rocket-border hover:bg-rocket-bg/50"
                  >
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="min-w-0 flex-1 flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rocket-blue/10 text-xs font-semibold text-rocket-blue">
                        {(lead.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-rocket-dark truncate group-hover:text-rocket-blue transition-colors">
                          {lead.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-rocket-muted truncate">
                          {lead.landing_pages?.business_name ?? "—"} &middot;{" "}
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-rocket-muted/40 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
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
        <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Campaigns</CardTitle>
            <Link
              href="/dashboard/campaigns"
              className="text-xs font-medium text-rocket-muted hover:text-rocket-blue transition-colors"
            >
              View all &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rocket-border/40">
                  <Megaphone className="h-6 w-6 text-rocket-muted/60" />
                </div>
                <p className="text-sm font-medium">No campaigns yet</p>
                <p className="mt-1 max-w-[200px] text-xs text-rocket-muted">
                  Create your first campaign to start generating leads.
                </p>
                <Link
                  href="/dashboard/campaigns/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rocket-border px-3 py-1.5 text-xs font-medium text-rocket-dark hover:bg-rocket-bg transition-colors"
                >
                  <Plus className="h-3 w-3" /> New Campaign
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {campaigns.slice(0, 10).map((c: { id: string; business_name: string; status: string; created_at: string }) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-transparent p-3 transition-all duration-150 hover:border-rocket-border hover:bg-rocket-bg/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-rocket-dark truncate">
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

      {/* Lead Outcomes funnel */}
      {leads.length > 0 && (
        <Card className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Lead Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 stagger-children">
              {funnel.map((f) => (
                <div key={f.status} className="rounded-xl border border-rocket-border p-4 text-center transition-colors hover:bg-rocket-bg/50">
                  <LeadStatusBadge status={f.status} />
                  <p className="mt-3 text-3xl font-bold tracking-tight">{f.count}</p>
                  <p className="mt-0.5 text-xs text-rocket-muted">{f.pct}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
