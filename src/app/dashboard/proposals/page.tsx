import { headers } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

type ProposalRow = {
  id: string;
  title: string;
  status: string;
  tier: string;
  big_idea: string | null;
  created_at: string;
  session_id: string | null;
  campaign_sessions: { business_name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-rocket-muted/10 text-rocket-muted border-rocket-muted/20",
  ready: "bg-blue-50 text-blue-700 border-blue-200",
  sent:  "bg-rocket-success/10 text-rocket-success border-rocket-success/20",
};

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  growth:  "Growth",
  scale:   "Scale",
};

export default async function ProposalsPage() {
  const headersList = await headers();
  const tenantId  = headersList.get("x-tenant-id") ?? "";
  const userRole  = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("proposals")
    .select(`
      id, title, status, tier, big_idea, created_at, session_id,
      campaign_sessions ( business_name )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!isSuperAdmin && tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data: rawProposals } = await query;
  const proposals = (rawProposals ?? []) as unknown as ProposalRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="mt-1 text-rocket-muted">
            Build and send campaign proposals to clients.
          </p>
        </div>
        <Link href="/dashboard/proposals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        </Link>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">No proposals yet</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              Create a proposal after running the campaign wizard. It assembles the
              big idea, offer, radio script, and pricing into one clean document.
            </p>
            <Link href="/dashboard/proposals/new" className="mt-4">
              <Button>Build your first proposal</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((p) => (
            <Link key={p.id} href={`/dashboard/proposals/${p.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {p.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${STATUS_COLORS[p.status] ?? ""}`}
                    >
                      {p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-rocket-muted">
                    {p.campaign_sessions?.business_name ?? "—"}
                  </p>
                  {p.big_idea && (
                    <p className="text-xs text-rocket-dark line-clamp-2 leading-relaxed">
                      {p.big_idea}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="secondary" className="text-xs">
                      {TIER_LABELS[p.tier] ?? p.tier}
                    </Badge>
                    <span className="text-xs text-rocket-muted">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
