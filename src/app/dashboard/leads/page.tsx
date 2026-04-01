import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";
import { LeadStatusUpdater } from "@/components/leads/LeadStatusUpdater";

export const dynamic = "force-dynamic";

/**
 * Internal Leads View (for reps)
 * Shows all leads across all campaigns and clients.
 * Source of truth: lp_leads joined with landing_pages.
 */
export default async function LeadsPage() {
  const headersList = await headers();
  const tenantId  = headersList.get("x-tenant-id") ?? "";
  const userRole  = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

  // Fetch leads with their landing page context (business name, slug)
  const { data: rawLeads } = await supabase
    .from("lp_leads")
    .select(`
      id,
      name,
      email,
      phone,
      status,
      notes,
      created_at,
      landing_pages (
        id,
        business_name,
        slug,
        session_id
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  // If not super admin, filter to leads belonging to this tenant's landing pages
  // (landing_pages doesn't have tenant_id yet — filter via campaign_sessions)
  type LpLead = {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    landing_pages: {
      id: string;
      business_name: string | null;
      slug: string;
      session_id: string | null;
    } | null;
  };

  let leads = (rawLeads ?? []) as unknown as LpLead[];

  // For non-super-admins: filter to sessions belonging to this tenant
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

      const allowedSessionIds = new Set((tenantSessions ?? []).map((s: { session_id: string }) => s.session_id));
      leads = leads.filter(
        (l) => !l.landing_pages?.session_id || allowedSessionIds.has(l.landing_pages.session_id),
      );
    }
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
              Leads appear here when someone fills out a landing page form or you add one manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{leads.length} Lead{leads.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-md border border-rocket-border p-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-rocket-dark truncate">
                      {lead.name || "Unknown"}
                    </p>
                    <p className="text-xs text-rocket-muted truncate">
                      {lead.email ?? lead.phone ?? "No contact info"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {lead.landing_pages?.business_name && (
                      <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                        {lead.landing_pages.business_name}
                      </Badge>
                    )}
                    <span className="hidden sm:block text-xs text-rocket-muted">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                    <LeadStatusBadge status={lead.status} />
                    <LeadStatusUpdater leadId={lead.id} currentStatus={lead.status} />
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
