import { headers } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadStatusUpdater } from "@/components/leads/LeadStatusUpdater";
import { PageHeader } from "@/components/ui/page-header";
import {
  UserCheck, Phone, CalendarCheck, TrendingUp, ChevronRight, Inbox, Activity,
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
    slug: string;
    session_id: string | null;
  } | null;
};

export default async function PortalPage() {
  const headersList = await headers();
  const tenantId  = headersList.get("x-tenant-id") ?? "";
  const userRole  = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

  const { data: rawLeads } = await supabase
    .from("lp_leads")
    .select(`
      id, name, email, phone, status, created_at,
      landing_pages ( business_name, slug, session_id )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

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

      const allowed = new Set((tenantSessions ?? []).map((s: { session_id: string }) => s.session_id));
      leads = leads.filter(
        (l) => !l.landing_pages?.session_id || allowed.has(l.landing_pages.session_id),
      );
    }
  }

  const stats = {
    total:     leads.length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    booked:    leads.filter((l) => l.status === "booked").length,
    closed:    leads.filter((l) => l.status === "closed").length,
  };

  const activityItems = leads.slice(0, 15).map((l) => ({
    id:        l.id,
    message:   `New lead: ${l.name ?? "Unknown"} from ${l.landing_pages?.business_name ?? "landing page"}`,
    createdAt: l.created_at,
  }));

  const statCards = [
    { label: "Total Leads",  value: stats.total,     description: "All time",      icon: UserCheck,     color: "bg-rocket-blue" },
    { label: "Contacted",    value: stats.contacted,  description: "We reached out", icon: Phone,         color: "bg-indigo-500" },
    { label: "Booked",       value: stats.booked,     description: "Appointments",   icon: CalendarCheck, color: "bg-rocket-success" },
    { label: "Closed",       value: stats.closed,     description: "New customers",  icon: TrendingUp,    color: "bg-rocket-accent" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Your Leads" subtitle="Everything happening with your campaign leads." />

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
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
              <p className="mt-0.5 text-xs text-rocket-muted">{s.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Leads — wider */}
        <Card className="lg:col-span-3 animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
            <Link
              href="/portal/leads"
              className="text-xs font-medium text-rocket-muted hover:text-rocket-blue transition-colors"
            >
              View all &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rocket-border/40">
                  <Inbox className="h-6 w-6 text-rocket-muted/60" />
                </div>
                <p className="text-sm font-medium text-rocket-dark">No leads yet</p>
                <p className="mt-1 max-w-[240px] text-xs text-rocket-muted">
                  Leads appear here when someone fills out your campaign form.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {leads.slice(0, 10).map((lead) => (
                  <div
                    key={lead.id}
                    className="group flex items-center justify-between rounded-lg border border-transparent p-3 gap-3 transition-all duration-150 hover:border-rocket-border hover:bg-rocket-bg/50"
                  >
                    <Link
                      href={`/portal/leads/${lead.id}`}
                      className="min-w-0 flex-1 flex items-center gap-3"
                    >
                      {/* Avatar initial */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rocket-blue/10 text-xs font-semibold text-rocket-blue">
                        {(lead.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-rocket-dark truncate group-hover:text-rocket-blue transition-colors">
                          {lead.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-rocket-muted truncate">
                          {lead.email ?? lead.phone ?? "No contact info"} &middot;{" "}
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

        {/* Activity Feed — narrower */}
        <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rocket-border/40">
                  <Activity className="h-6 w-6 text-rocket-muted/60" />
                </div>
                <p className="text-sm font-medium text-rocket-dark">No activity yet</p>
                <p className="mt-1 max-w-[200px] text-xs text-rocket-muted">
                  Activity appears here as leads come in.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activityItems.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <div className="relative mt-1.5 flex flex-col items-center">
                      <span className="h-2 w-2 rounded-full bg-rocket-blue ring-4 ring-rocket-blue/10" />
                    </div>
                    <div className="min-w-0 pb-3 border-b border-rocket-border/50 last:border-0 flex-1">
                      <p className="text-sm text-rocket-dark leading-snug">{item.message}</p>
                      <p className="mt-0.5 text-xs text-rocket-muted">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
