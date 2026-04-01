import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { LeadsSummaryCard } from "@/components/dashboard/LeadsSummaryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadStatusUpdater } from "@/components/leads/LeadStatusUpdater";
import { UserCheck, Phone, CalendarCheck, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Client Portal — "Your Leads"
 *
 * Every screen answers: "What happened with my leads?"
 *
 * Shows:
 * - Big number cards (total leads, contacted, booked, closed)
 * - Recent leads with status + one-tap status update
 * - Activity feed (lead arrival timeline)
 */
export default async function PortalPage() {
  const headersList = await headers();
  const tenantId  = headersList.get("x-tenant-id") ?? "";
  const userRole  = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

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

  const { data: rawLeads } = await supabase
    .from("lp_leads")
    .select(`
      id, name, email, phone, status, created_at,
      landing_pages ( business_name, slug, session_id )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  let leads = (rawLeads ?? []) as unknown as LpLead[];

  // Filter to this tenant's leads
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

  // Activity feed: most recent leads as timeline events
  const activityItems = leads.slice(0, 15).map((l) => ({
    id:        l.id,
    message:   `New lead: ${l.name ?? "Unknown"} from ${l.landing_pages?.business_name ?? "landing page"}`,
    createdAt: l.created_at,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <LeadsSummaryCard
          label="Total Leads"
          value={stats.total}
          description="All time"
          icon={<UserCheck className="h-4 w-4 text-rocket-muted" />}
        />
        <LeadsSummaryCard
          label="Contacted"
          value={stats.contacted}
          description="We reached out"
          icon={<Phone className="h-4 w-4 text-rocket-muted" />}
        />
        <LeadsSummaryCard
          label="Booked"
          value={stats.booked}
          description="Appointments"
          icon={<CalendarCheck className="h-4 w-4 text-rocket-muted" />}
        />
        <LeadsSummaryCard
          label="Closed"
          value={stats.closed}
          description="New customers"
          icon={<TrendingUp className="h-4 w-4 text-rocket-muted" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="py-8 text-center text-sm text-rocket-muted">
                No leads yet. They will appear here as they come in from your campaign.
              </p>
            ) : (
              <div className="space-y-3">
                {leads.slice(0, 10).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-md border border-rocket-border p-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-rocket-dark truncate">
                        {lead.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-rocket-muted">
                        {lead.email ?? lead.phone ?? "No contact info"} &middot;{" "}
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
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

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-rocket-muted">
                Activity will appear here as leads come in.
              </p>
            ) : (
              <div className="space-y-3">
                {activityItems.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rocket-blue/60 ring-4 ring-rocket-blue/10" />
                    <div className="min-w-0">
                      <p className="text-rocket-dark">{item.message}</p>
                      <p className="text-xs text-rocket-muted">
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
