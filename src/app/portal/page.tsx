import { headers } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadStatusUpdater } from "@/components/leads/LeadStatusUpdater";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignJourney, buildMilestones } from "@/components/portal/CampaignJourney";
import {
  UserCheck, Phone, CalendarCheck, TrendingUp, ChevronRight, Inbox,
  Rocket, Radio, Globe, Zap, ExternalLink,
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

  // Fetch avg ticket for ROI calculation
  let avgTicket = 0;
  if (tenantId) {
    const { data: sessions } = await supabase
      .from("campaign_sessions")
      .select("intake_form")
      .eq("tenant_id", tenantId)
      .limit(1);
    if (sessions && sessions.length > 0) {
      const intake = (sessions[0] as { intake_form: Record<string, string> | null }).intake_form;
      avgTicket = parseFloat(intake?.avgTicket ?? "0") || 0;
    }
  }

  const estimatedRevenue = (stats.booked + stats.closed) * avgTicket;
  const hasRoi = avgTicket > 0 && (stats.booked + stats.closed) > 0;

  // Fetch campaign context — used for welcome state + journey tracker
  let campaignContext: { businessName: string; lpUrl: string | null; scriptPreview: string | null; hasPixel: boolean; campaignActive: boolean; lpLive: boolean } | null = null;
  if (tenantId) {
    const { data: sessions } = await supabase
      .from("campaign_sessions")
      .select("session_id, business_name, lp_slug, lp_live, brand_kit_id, status")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      const s = sessions[0] as { session_id: string; business_name: string; lp_slug: string | null; lp_live: boolean; brand_kit_id: string | null; status: string };
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";

      // Fetch radio script if available
      let script: string | null = null;
      const { data: assets } = await supabase
        .from("campaign_assets")
        .select("content")
        .eq("session_id", s.session_id)
        .eq("asset_type", "radio-script")
        .limit(1);
      if (assets && assets.length > 0) {
        const content = (assets[0] as { content: { script?: string } }).content;
        script = content?.script?.slice(0, 200) ?? null;
      }

      // Check if pixel is set
      let hasPixel = false;
      if (s.brand_kit_id) {
        const { data: bk } = await supabase
          .from("brand_kits")
          .select("meta_pixel_id")
          .eq("id", s.brand_kit_id)
          .single();
        hasPixel = !!(bk as { meta_pixel_id: string | null } | null)?.meta_pixel_id;
      }

      campaignContext = {
        businessName: s.business_name,
        lpUrl: s.lp_live && s.lp_slug ? `${baseUrl}/lp/${s.lp_slug}` : null,
        scriptPreview: script,
        hasPixel,
        campaignActive: s.status === "active" || s.status === "published",
        lpLive: !!s.lp_live,
      };
    }
  }

  // Build journey milestones
  const firstLead = leads.length > 0 ? leads[leads.length - 1] : null;
  const milestones = campaignContext
    ? buildMilestones({
        campaignActive: campaignContext.campaignActive,
        lpLive: campaignContext.lpLive,
        lpUrl: campaignContext.lpUrl,
        hasPixel: campaignContext.hasPixel,
        totalLeads: stats.total,
        firstLeadName: firstLead?.name ?? null,
        bookedCount: stats.booked,
        closedCount: stats.closed,
      })
    : null;

  const activityItems = leads.slice(0, 15).map((l) => ({
    id:        l.id,
    message:   `New lead: ${l.name ?? "Unknown"} from ${l.landing_pages?.business_name ?? "landing page"}`,
    createdAt: l.created_at,
  }));

  const statCards = [
    { label: "Total Leads",  value: stats.total,     description: "All time",      icon: UserCheck,     color: "bg-rocket-blue" },
    { label: "Contacted",    value: stats.contacted,  description: "We reached out", icon: Phone,         color: "bg-indigo-500" },
    { label: "Booked",       value: stats.booked,     description: "Appointments",   icon: CalendarCheck, color: "bg-rocket-success-bright" },
    { label: "Closed",       value: stats.closed,     description: "New customers",  icon: TrendingUp,    color: "bg-rocket-accent-bright" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Your Leads" subtitle="Everything happening with your campaign leads." />

      {/* Welcome state — shown when campaign exists but no leads yet */}
      {stats.total === 0 && campaignContext && campaignContext.campaignActive && (
        <Card className="relative overflow-hidden border-rocket-blue/20 bg-gradient-to-r from-rocket-blue/5 to-transparent animate-fade-in-up">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-rocket-blue" />
          <CardContent className="py-6 pl-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rocket-blue/10">
                <Rocket className="h-5 w-5 text-rocket-blue" />
              </div>
              <div>
                <p className="text-lg font-semibold text-rocket-dark">Your campaign is live!</p>
                <p className="text-sm text-rocket-muted">Everything is set up for {campaignContext.businessName}. Leads will appear here as they come in.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl border border-rocket-border bg-white p-3">
                <Radio className="h-4 w-4 text-rocket-blue shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-rocket-dark">Radio spot running</p>
                  {campaignContext.scriptPreview ? (
                    <p className="mt-0.5 text-[11px] text-rocket-muted line-clamp-2 italic">&ldquo;{campaignContext.scriptPreview}...&rdquo;</p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-rocket-muted">Your ad is on the air</p>
                  )}
                </div>
              </div>

              {campaignContext.lpUrl && (
                <div className="flex items-start gap-3 rounded-xl border border-rocket-border bg-white p-3">
                  <Globe className="h-4 w-4 text-rocket-blue shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-rocket-dark">Landing page live</p>
                    <a
                      href={campaignContext.lpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-[11px] text-rocket-blue hover:underline"
                    >
                      View page <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-rocket-border bg-white p-3">
                <Zap className="h-4 w-4 text-rocket-blue shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-rocket-dark">Auto-response ready</p>
                  <p className="mt-0.5 text-[11px] text-rocket-muted">Every lead gets a text in under 60 seconds</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* ROI Card — the number that prevents cancellation */}
      {hasRoi && (
        <Card className="relative overflow-hidden border-rocket-success/30 bg-gradient-to-r from-rocket-success-bright/5 to-transparent animate-fade-in-up">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-rocket-success-bright" />
          <CardContent className="flex items-center justify-between gap-6 py-5 pl-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-rocket-muted">Estimated Revenue from Leads</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-rocket-dark">
                ${estimatedRevenue.toLocaleString()}
              </p>
              <p className="mt-0.5 text-sm text-rocket-muted">
                {stats.booked + stats.closed} booked/closed &times; ${avgTicket.toLocaleString()} avg ticket
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium uppercase tracking-wide text-rocket-muted">Your Campaign ROI</p>
              <p className="mt-1 text-4xl font-bold text-rocket-success">
                {estimatedRevenue > 0 ? `${(estimatedRevenue / 1497).toFixed(1)}x` : "—"}
              </p>
              <p className="mt-0.5 text-xs text-rocket-muted">return on investment</p>
            </div>
          </CardContent>
        </Card>
      )}

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

        {/* Right column — Journey + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Journey — always visible when campaign exists */}
          {milestones && (
            <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Your Campaign Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <CampaignJourney milestones={milestones} />
              </CardContent>
            </Card>
          )}

          {/* Activity Feed — shown when there are leads */}
          {activityItems.length > 0 && (
            <Card className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
