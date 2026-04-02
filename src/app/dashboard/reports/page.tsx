import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelBar } from "@/components/reports/FunnelBar";
import { StatTile } from "@/components/reports/StatTile";
import { SourceBreakdown } from "@/components/reports/SourceBreakdown";
import { CampaignTable } from "@/components/reports/CampaignTable";
import { BarChart2 } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Internal Reporting Dashboard
 * Source of truth: lp_leads (real lead data) + campaign_sessions (campaign data)
 * MVP item 7: leads, contact rate, booked, closed.
 */
export default async function ReportsPage() {
  const headersList = await headers();
  const tenantId  = headersList.get("x-tenant-id") ?? "";
  const userRole  = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

  // ─── Fetch sessions for this tenant ────────────────────────────────────────
  let sessionsQuery = supabase
    .from("campaign_sessions")
    .select("session_id, business_name, updated_at, created_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (!isSuperAdmin && tenantId) {
    sessionsQuery = sessionsQuery.eq("tenant_id", tenantId);
  }

  const { data: sessions } = await sessionsQuery;
  const sessionIds = (sessions ?? []).map((s: { session_id: string }) => s.session_id);

  // ─── Fetch landing pages linked to those sessions ───────────────────────────
  const { data: landingPages } = sessionIds.length > 0
    ? await supabase
        .from("landing_pages")
        .select("id, slug, business_name, session_id, lead_count")
        .in("session_id", sessionIds)
    : { data: [] };

  const lpIds = (landingPages ?? []).map((lp: { id: string }) => lp.id);
  // ─── Fetch all leads for those landing pages ────────────────────────────────
  const { data: allLeadRows } = lpIds.length > 0
    ? await supabase
        .from("lp_leads")
        .select("id, status, created_at, landing_page_id, extra_fields")
        .in("landing_page_id", lpIds)
    : { data: [] };

  type LeadRow = { id: string; status: string; created_at: string; landing_page_id: string; extra_fields: Record<string, string> | null };
  const allLeads = (allLeadRows ?? []) as LeadRow[];

  // ─── Funnel counts ──────────────────────────────────────────────────────────
  const total     = allLeads.length;
  const contacted = allLeads.filter((l) => l.status !== "new").length;
  const booked    = allLeads.filter((l) => ["booked", "closed"].includes(l.status)).length;
  const closed    = allLeads.filter((l) => l.status === "closed").length;
  const lost      = allLeads.filter((l) => l.status === "lost").length;

  const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;
  const bookRate    = contacted > 0 ? Math.round((booked / contacted) * 100) : 0;
  const closeRate   = booked > 0 ? Math.round((closed / booked) * 100) : 0;

  // ─── This month vs last month ───────────────────────────────────────────────
  const now = new Date();
  const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthLeads = allLeads.filter((l) => new Date(l.created_at) >= startOfMonth).length;
  const lastMonthLeads = allLeads.filter(
    (l) => new Date(l.created_at) >= startOfLastMonth && new Date(l.created_at) < startOfMonth,
  ).length;
  const monthTrend = thisMonthLeads - lastMonthLeads;

  // ─── Source breakdown — from "How did you hear about us?" field ────────────
  const sourceCounts = new Map<string, number>();
  for (const lead of allLeads) {
    const referral = lead.extra_fields?.["How did you hear about us?"] ?? "Not specified";
    sourceCounts.set(referral, (sourceCounts.get(referral) ?? 0) + 1);
  }
  const sources = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // ─── Campaign rows ──────────────────────────────────────────────────────────
  type SessionRow = { session_id: string; business_name: string; updated_at: string; created_at: string };
  const campaignRows = (sessions ?? []).map((s: SessionRow) => {
    const lp = (landingPages ?? []).find((l: { session_id: string | null }) => l.session_id === s.session_id);
    const lpLeads = lp
      ? allLeads.filter((l) => l.landing_page_id === lp.id)
      : [];

    return {
      id:         s.session_id,
      name:       s.business_name,
      brandName:  s.business_name,
      status:     "active" as const,
      totalLeads: lpLeads.length,
      contacted:  lpLeads.filter((l) => l.status !== "new").length,
      booked:     lpLeads.filter((l) => ["booked", "closed"].includes(l.status)).length,
      closed:     lpLeads.filter((l) => l.status === "closed").length,
    };
  });

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (total === 0 && (sessions ?? []).length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="mt-1 text-rocket-muted">Campaign performance and lead outcomes.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart2 className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">No data yet</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              Reports will populate once you have active campaigns and leads coming in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-rocket-muted">Campaign performance and lead outcomes — all time.</p>
      </div>

      {/* ─── Top Stats ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Leads"
          value={total}
          trendLabel={monthTrend >= 0 ? `+${monthTrend} this month` : `${monthTrend} this month`}
          trend={monthTrend >= 0 ? "up" : "down"}
          accent
        />
        <StatTile
          label="Contact Rate"
          value={contactRate}
          unit="%"
          trendLabel={`${contacted} of ${total} reached`}
          trend={contactRate >= 80 ? "up" : contactRate >= 50 ? "neutral" : "down"}
        />
        <StatTile
          label="Booking Rate"
          value={bookRate}
          unit="%"
          trendLabel={`${booked} appointments booked`}
          trend={bookRate >= 30 ? "up" : "neutral"}
        />
        <StatTile
          label="Close Rate"
          value={closeRate}
          unit="%"
          trendLabel={`${closed} new customers`}
          trend={closeRate >= 50 ? "up" : "neutral"}
        />
      </div>

      {/* ─── Funnel + Source ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FunnelBar label="New Leads"  count={total}     total={total} color="bg-rocket-blue"    sublabel="captured" />
            <FunnelBar label="Contacted"  count={contacted} total={total} color="bg-rocket-accent-bright"  sublabel="texted or emailed" />
            <FunnelBar label="Booked"     count={booked}    total={total} color="bg-rocket-success-bright" sublabel="appointment set" />
            <FunnelBar label="Closed"     count={closed}    total={total} color="bg-green-700"      sublabel="new customers" />
            {lost > 0 && (
              <FunnelBar label="Lost" count={lost} total={total} color="bg-rocket-muted" sublabel="not converted" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lead Sources</CardTitle></CardHeader>
          <CardContent>
            <SourceBreakdown sources={sources} total={total} />
            <div className="mt-6 rounded-md border border-rocket-border bg-rocket-bg p-3">
              <p className="text-xs text-rocket-muted">This month</p>
              <p className="mt-0.5 text-2xl font-bold text-rocket-dark">{thisMonthLeads}</p>
              <p className="text-xs text-rocket-muted">
                leads captured
                {lastMonthLeads > 0 && (
                  <span className={monthTrend >= 0 ? " text-rocket-success" : " text-rocket-danger"}>
                    {" "}({monthTrend >= 0 ? "+" : ""}{monthTrend} vs last month)
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Campaign Breakdown ──────────────────────────────────────────────── */}
      {campaignRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              By Campaign
              <span className="ml-2 text-sm font-normal text-rocket-muted">
                {campaignRows.length} campaign{campaignRows.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignTable campaigns={campaignRows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
