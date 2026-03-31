/**
 * CampaignTable
 *
 * Tabular breakdown of leads and outcomes per campaign.
 * Answers: "Which campaigns are actually converting?"
 */

import { Badge } from "@/components/ui/badge";

interface CampaignRow {
  id: string;
  name: string;
  brandName: string;
  status: string;
  totalLeads: number;
  contacted: number;
  booked: number;
  closed: number;
}

interface CampaignTableProps {
  campaigns: CampaignRow[];
}

function conversionRate(num: number, denom: number): string {
  if (denom === 0) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-rocket-success/10 text-rocket-success border-rocket-success/20",
  draft: "bg-rocket-muted/10 text-rocket-muted border-rocket-muted/20",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
};

export function CampaignTable({ campaigns }: CampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-rocket-muted">
        No campaigns yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rocket-border text-left">
            <th className="pb-2 pr-4 font-medium text-rocket-muted">Campaign</th>
            <th className="pb-2 pr-4 font-medium text-rocket-muted">Status</th>
            <th className="pb-2 pr-4 text-right font-medium text-rocket-muted">Leads</th>
            <th className="pb-2 pr-4 text-right font-medium text-rocket-muted">Contacted</th>
            <th className="pb-2 pr-4 text-right font-medium text-rocket-muted">Booked</th>
            <th className="pb-2 text-right font-medium text-rocket-muted">Closed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rocket-border">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-rocket-bg/50">
              <td className="py-3 pr-4">
                <p className="font-medium text-rocket-dark">{c.name}</p>
                <p className="text-xs text-rocket-muted">{c.brandName}</p>
              </td>
              <td className="py-3 pr-4">
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_COLORS[c.status] ?? ""}`}
                >
                  {c.status}
                </Badge>
              </td>
              <td className="py-3 pr-4 text-right font-medium text-rocket-dark">
                {c.totalLeads}
              </td>
              <td className="py-3 pr-4 text-right">
                <span className="font-medium text-rocket-dark">{c.contacted}</span>
                <span className="ml-1 text-xs text-rocket-muted">
                  {conversionRate(c.contacted, c.totalLeads)}
                </span>
              </td>
              <td className="py-3 pr-4 text-right">
                <span className="font-medium text-rocket-dark">{c.booked}</span>
                <span className="ml-1 text-xs text-rocket-muted">
                  {conversionRate(c.booked, c.totalLeads)}
                </span>
              </td>
              <td className="py-3 text-right">
                <span className="font-bold text-rocket-success">{c.closed}</span>
                <span className="ml-1 text-xs text-rocket-muted">
                  {conversionRate(c.closed, c.totalLeads)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
