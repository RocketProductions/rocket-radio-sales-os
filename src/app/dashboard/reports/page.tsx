import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelBar } from "@/components/reports/FunnelBar";
import { StatTile } from "@/components/reports/StatTile";
import { SourceBreakdown } from "@/components/reports/SourceBreakdown";
import { CampaignTable } from "@/components/reports/CampaignTable";
import { BarChart2 } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Internal Reporting Dashboard
 *
 * Answers the question every sales rep and manager needs:
 * "Are our campaigns working? How many leads are we converting?"
 *
 * MVP item 7: Simple view — how many leads, how many contacted,
 * how many booked, how many closed.
 */
export default async function ReportsPage() {
  // ─── Aggregate all lead data ─────────────────────────────────────────────
  let allLeads: Array<{ status: string; source: string; createdAt: Date }> = [];
  let campaigns: Array<{
    id: string;
    name: string;
    status: string;
    brand: { name: string };
    _count: { leads: number };
    leads: Array<{ status: string }>;
  }> = [];

  try {
    [allLeads, campaigns] = await Promise.all([
      prisma.lead.findMany({
        select: { status: true, source: true, createdAt: true },
      }),
      prisma.campaign.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          brand: { select: { name: true } },
          _count: { select: { leads: true } },
          leads: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  } catch {
    // DB not connected — show empty state
  }

  // ─── Funnel counts ────────────────────────────────────────────────────────
  const total = allLeads.length;
  const contacted = allLeads.filter((l) => l.status !== "new").length;
  const booked = allLeads.filter((l) =>
    ["booked", "closed"].includes(l.status),
  ).length;
  const closed = allLeads.filter((l) => l.status === "closed").length;
  const lost = allLeads.filter((l) => l.status === "lost").length;

  // ─── Conversion rates ─────────────────────────────────────────────────────
  const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;
  const bookRate = contacted > 0 ? Math.round((booked / contacted) * 100) : 0;
  const closeRate = booked > 0 ? Math.round((closed / booked) * 100) : 0;

  // ─── Source breakdown ─────────────────────────────────────────────────────
  const sourceCounts = allLeads.reduce<Record<string, number>>((acc, l) => {
    acc[l.source] = (acc[l.source] ?? 0) + 1;
    return acc;
  }, {});
  const sources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // ─── This month vs last month ─────────────────────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthLeads = allLeads.filter((l) => l.createdAt >= startOfMonth).length;
  const lastMonthLeads = allLeads.filter(
    (l) => l.createdAt >= startOfLastMonth && l.createdAt < startOfMonth,
  ).length;
  const monthTrend = thisMonthLeads - lastMonthLeads;

  // ─── Campaign rows ────────────────────────────────────────────────────────
  const campaignRows = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    brandName: c.brand.name,
    status: c.status,
    totalLeads: c._count.leads,
    contacted: c.leads.filter((l) => l.status !== "new").length,
    booked: c.leads.filter((l) => ["booked", "closed"].includes(l.status)).length,
    closed: c.leads.filter((l) => l.status === "closed").length,
  }));

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (total === 0 && campaigns.length === 0) {
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
        <p className="mt-1 text-rocket-muted">
          Campaign performance and lead outcomes — all time.
        </p>
      </div>

      {/* ─── Top Stats ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Leads"
          value={total}
          trendLabel={
            monthTrend >= 0
              ? `+${monthTrend} this month`
              : `${monthTrend} this month`
          }
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

      {/* ─── Funnel + Source side by side ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FunnelBar
              label="New Leads"
              count={total}
              total={total}
              color="bg-rocket-blue"
              sublabel="captured"
            />
            <FunnelBar
              label="Contacted"
              count={contacted}
              total={total}
              color="bg-rocket-accent"
              sublabel="texted or emailed"
            />
            <FunnelBar
              label="Booked"
              count={booked}
              total={total}
              color="bg-rocket-success"
              sublabel="appointment set"
            />
            <FunnelBar
              label="Closed"
              count={closed}
              total={total}
              color="bg-green-700"
              sublabel="new customers"
            />
            {lost > 0 && (
              <FunnelBar
                label="Lost"
                count={lost}
                total={total}
                color="bg-rocket-muted"
                sublabel="not converted"
              />
            )}
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceBreakdown sources={sources} total={total} />

            {/* This month callout */}
            <div className="mt-6 rounded-md border border-rocket-border bg-rocket-bg p-3">
              <p className="text-xs text-rocket-muted">This month</p>
              <p className="mt-0.5 text-2xl font-bold text-rocket-dark">{thisMonthLeads}</p>
              <p className="text-xs text-rocket-muted">
                leads captured
                {lastMonthLeads > 0 && (
                  <span
                    className={
                      monthTrend >= 0
                        ? " text-rocket-success"
                        : " text-rocket-danger"
                    }
                  >
                    {" "}
                    ({monthTrend >= 0 ? "+" : ""}
                    {monthTrend} vs last month)
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Campaign Breakdown ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            By Campaign
            <span className="ml-2 text-sm font-normal text-rocket-muted">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignTable campaigns={campaignRows} />
        </CardContent>
      </Card>
    </div>
  );
}
