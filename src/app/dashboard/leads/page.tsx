import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Internal Leads View (for reps)
 * Shows all leads across all campaigns and clients.
 */
export default async function LeadsPage() {
  let leads: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    source: string;
    createdAt: Date;
    campaign: { id: string; name: string; brand: { name: string } };
  }> = [];

  try {
    leads = await prisma.lead.findMany({
      include: {
        campaign: { select: { id: true, name: true, brand: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    // DB not connected — show empty state
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="mt-1 text-rocket-muted">
          Every lead across all campaigns and clients.
        </p>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">No leads yet</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              Leads will appear here as they come in from your campaigns — via forms, Meta Lead Ads, or manual entry.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{leads.length} Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-md border border-rocket-border p-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown"}
                      </p>
                      <p className="text-xs text-rocket-muted">
                        {lead.email ?? lead.phone ?? "No contact info"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {lead.campaign.brand.name}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {lead.source.replace(/_/g, " ")}
                    </Badge>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
