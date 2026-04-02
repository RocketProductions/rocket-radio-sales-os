import { headers } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  Users, Send, MessageSquare, CheckCircle, Building2, Plus, ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Prospect = {
  id: string;
  tenant_id: string | null;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  status: string | null;
  notes: string | null;
  rep_name: string | null;
  source: string | null;
  created_at: string;
};

type OutreachEmail = {
  id: string;
  prospect_id: string;
};

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "outline"; label: string }> = {
  new:       { variant: "secondary", label: "New" },
  pitched:   { variant: "default",   label: "Pitched" },
  responded: { variant: "warning",   label: "Responded" },
  meeting:   { variant: "success",   label: "Meeting" },
  closed:    { variant: "success",   label: "Closed" },
};

function statusBadge(status: string | null) {
  const s = STATUS_STYLES[status ?? "new"] ?? STATUS_STYLES.new;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default async function ProspectsPage() {
  const headersList = await headers();
  const tenantId     = headersList.get("x-tenant-id") ?? "";
  const userRole     = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

  // Fetch prospects
  let prospectQuery = supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!isSuperAdmin && tenantId) {
    prospectQuery = prospectQuery.eq("tenant_id", tenantId);
  }

  const { data: rawProspects } = await prospectQuery;
  const prospects = (rawProspects ?? []) as unknown as Prospect[];

  // Fetch outreach emails to determine which prospects have been pitched
  const prospectIds = prospects.map((p) => p.id);
  const outreachByProspect = new Map<string, number>();

  if (prospectIds.length > 0) {
    const { data: rawEmails } = await supabase
      .from("outreach_emails")
      .select("id, prospect_id")
      .in("prospect_id", prospectIds);

    const emails = (rawEmails ?? []) as unknown as OutreachEmail[];
    for (const e of emails) {
      outreachByProspect.set(e.prospect_id, (outreachByProspect.get(e.prospect_id) ?? 0) + 1);
    }
  }

  // Pipeline stats
  const totalProspects = prospects.length;
  const pitched        = prospects.filter((p) => outreachByProspect.has(p.id)).length;
  const responded      = prospects.filter((p) => p.status === "responded").length;
  const closed         = prospects.filter((p) => p.status === "closed").length;

  const statCards = [
    { label: "Total Prospects", value: totalProspects, sub: "In pipeline",                                                                                           icon: Users,          color: "bg-rocket-blue" },
    { label: "Pitched",         value: pitched,        sub: totalProspects > 0 ? `${Math.round((pitched / totalProspects) * 100)}% of total` : "No prospects yet",    icon: Send,           color: "bg-indigo-500" },
    { label: "Responded",       value: responded,      sub: pitched > 0 ? `${Math.round((responded / pitched) * 100)}% of pitched` : "No pitches yet",               icon: MessageSquare,  color: "bg-rocket-accent-bright" },
    { label: "Closed",          value: closed,          sub: totalProspects > 0 ? `${Math.round((closed / totalProspects) * 100)}% close rate` : "No prospects yet",  icon: CheckCircle,    color: "bg-rocket-success-bright" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prospects"
        subtitle="Find and pitch new advertisers"
        action={
          <Link href="/dashboard/prospects/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Prospect
            </Button>
          </Link>
        }
      />

      {/* Pipeline Stats */}
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

      {/* Prospect List */}
      {prospects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rocket-border/40">
              <Building2 className="h-6 w-6 text-rocket-muted/60" />
            </div>
            <h3 className="text-lg font-medium">No prospects yet</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              Add your first prospect to start building your outreach pipeline.
            </p>
            <Link href="/dashboard/prospects/new" className="mt-4">
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Add your first prospect
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {totalProspects} Prospect{totalProspects !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prospects.map((prospect) => {
                const emailCount = outreachByProspect.get(prospect.id) ?? 0;
                const effectiveStatus = prospect.status ?? (emailCount > 0 ? "pitched" : "new");

                return (
                  <div
                    key={prospect.id}
                    className="group flex items-center justify-between rounded-lg border border-rocket-border p-3 gap-3 transition-all duration-150 hover:border-rocket-blue/30 hover:bg-rocket-bg/50"
                  >
                    {/* Left: Business info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-rocket-dark truncate">
                          {prospect.business_name}
                        </p>
                        {prospect.website && (
                          <a
                            href={prospect.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-rocket-muted hover:text-rocket-blue transition-colors"
                            title={prospect.website}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-rocket-muted">
                        {prospect.contact_name && (
                          <span>{prospect.contact_name}</span>
                        )}
                        {prospect.contact_name && prospect.email && (
                          <span className="text-rocket-border">|</span>
                        )}
                        {prospect.email && <span>{prospect.email}</span>}
                        {!prospect.contact_name && !prospect.email && (
                          <span>No contact info</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Badges, score, date, action */}
                    <div className="flex shrink-0 items-center gap-2">
                      {prospect.industry && (
                        <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                          {prospect.industry}
                        </Badge>
                      )}
                      {statusBadge(effectiveStatus)}
                      {emailCount > 0 && (
                        <Badge variant="secondary" className="hidden md:inline-flex text-xs">
                          {emailCount} email{emailCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      <span className="hidden sm:block text-xs text-rocket-muted whitespace-nowrap">
                        {new Date(prospect.created_at).toLocaleDateString()}
                      </span>
                      <Link href={`/dashboard/outreach?prospectId=${prospect.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Generate Pitch
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
