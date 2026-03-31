import { prisma } from "@/lib/prisma";
import { LeadsSummaryCard } from "@/components/dashboard/LeadsSummaryCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { UserCheck, Phone, CalendarCheck, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Client Portal — "Your Leads"
 *
 * Every screen answers: "What happened with my leads?"
 *
 * Shows:
 * - Big number cards (total leads, contacted, booked, closed)
 * - Recent leads with status
 * - Activity feed ("We texted Sarah at 2:03pm")
 */
export default async function PortalPage() {
  // In production, filter by the logged-in client's brand
  // For MVP, show all leads from the most recent active campaign
  let leads: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
    source: string;
    createdAt: Date;
    events: Array<{ id: string; eventType: string; message: string | null; createdAt: Date }>;
  }> = [];

  let stats = { total: 0, contacted: 0, booked: 0, closed: 0 };

  try {
    leads = await prisma.lead.findMany({
      include: {
        events: { orderBy: { createdAt: "desc" }, take: 2 },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    stats = {
      total: leads.length,
      contacted: leads.filter((l) => l.status === "contacted").length,
      booked: leads.filter((l) => l.status === "booked").length,
      closed: leads.filter((l) => l.status === "closed").length,
    };
  } catch {
    // DB not connected — show empty state
  }

  // Flatten all events for activity feed
  const allEvents = leads
    .flatMap((l) => l.events)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <LeadsSummaryCard
          label="Total Leads"
          value={stats.total}
          description="This month"
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
                  <div key={lead.id} className="flex items-center justify-between rounded-md border border-rocket-border p-3">
                    <div>
                      <p className="font-medium text-sm">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown"}
                      </p>
                      <p className="text-xs text-rocket-muted">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <ActivityFeed events={allEvents.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))} />
      </div>
    </div>
  );
}
