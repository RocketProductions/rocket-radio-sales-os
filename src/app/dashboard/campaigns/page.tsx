import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Megaphone } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPlanLimits } from "@/lib/planLimits";
import { CampaignsList, type CampaignSession } from "@/components/campaigns/CampaignsList";

export default async function CampaignsPage() {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id") ?? "";
  const userId      = headersList.get("x-user-id") ?? "";
  const userRole    = headersList.get("x-user-role") ?? "rep";

  const supabase = getSupabaseAdmin();

  // ── Fetch plan tier ────────────────────────────────────────────────────────
  let planTier = "starter";
  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("plan_tier")
      .eq("id", tenantId)
      .single();
    planTier = (tenant as { plan_tier?: string } | null)?.plan_tier ?? "starter";
  }

  const limits = getPlanLimits(planTier);

  // ── Fetch sessions (role-aware) ────────────────────────────────────────────
  let query = supabase
    .from("campaign_sessions")
    .select(
      "id, session_id, user_id, tenant_id, user_email, business_name, brand_kit_id, lp_slug, lp_live, asset_count, status, created_at"
    )
    .order("created_at", { ascending: false });

  if (userRole === "super_admin") {
    // no filter — all sessions
  } else if (userRole === "admin" || userRole === "manager") {
    query = query.eq("tenant_id", tenantId);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data: sessions } = await query;
  const allSessions = (sessions ?? []) as CampaignSession[];

  // ── Compute brand count for usage bar ─────────────────────────────────────
  const activeSessions = allSessions.filter(
    (s) => s.status === "active" && s.tenant_id === tenantId
  );
  const brandCount = new Set(
    activeSessions.map((s) => s.business_name.toLowerCase())
  ).size;

  const isSuperAdmin = userRole === "super_admin";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="mt-1 text-rocket-muted">
            Build and manage revenue campaigns for your clients.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* At brand limit — upgrade prompt */}
      {!isSuperAdmin && brandCount >= limits.brands && limits.brands < 999 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium text-amber-900">
                You&apos;ve reached your brand limit
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                {planTier === "starter"
                  ? "Upgrade to Growth to manage 2 brands, or Agency for unlimited."
                  : "Upgrade to Agency for unlimited brands."}
              </p>
            </div>
            <Link href="/dashboard/billing" className="shrink-0">
              <Button variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                Upgrade Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {allSessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">No campaigns yet</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              Create your first campaign to start generating leads for a local business.
            </p>
            <Link href="/dashboard/campaigns/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <CampaignsList
          sessions={allSessions}
          userRole={userRole}
          planTier={planTier}
          brandCount={brandCount}
          brandLimit={limits.brands}
        />
      )}
    </div>
  );
}
