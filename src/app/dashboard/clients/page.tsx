import { headers } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Users, ExternalLink, Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

interface ClientRow {
  key: string;
  businessName: string;
  brandKitId: string | null;
  logoUrl: string | null;
  industry: string | null;
  websiteUrl: string | null;
  campaignCount: number;
  lastActive: string;
  firstSessionId: string;
}

export default async function ClientsPage() {
  const headersList = await headers();
  const tenantId  = headersList.get("x-tenant-id") ?? "";
  const userRole  = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("campaign_sessions")
    .select(`
      session_id,
      business_name,
      brand_kit_id,
      updated_at,
      created_at,
      brand_kits (
        business_name,
        logo_url,
        industry,
        website_url
      )
    `)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (!isSuperAdmin && tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data: sessions } = await query;

  // Group by brand_kit_id (same business across sessions) or business_name
  const clientMap = new Map<string, ClientRow>();

  for (const s of sessions ?? []) {
    const raw = s as {
      session_id: string;
      business_name: string;
      brand_kit_id: string | null;
      updated_at: string;
      created_at: string;
      brand_kits: {
        business_name: string | null;
        logo_url: string | null;
        industry: string | null;
        website_url: string | null;
      } | null;
    };

    const key = raw.brand_kit_id ?? raw.business_name.toLowerCase().trim();
    const existing = clientMap.get(key);

    if (!existing) {
      clientMap.set(key, {
        key,
        businessName: raw.brand_kits?.business_name ?? raw.business_name,
        brandKitId:   raw.brand_kit_id,
        logoUrl:      raw.brand_kits?.logo_url ?? null,
        industry:     raw.brand_kits?.industry ?? null,
        websiteUrl:   raw.brand_kits?.website_url ?? null,
        campaignCount: 1,
        lastActive:   raw.updated_at,
        firstSessionId: raw.session_id,
      });
    } else {
      existing.campaignCount++;
      if (new Date(raw.updated_at) > new Date(existing.lastActive)) {
        existing.lastActive    = raw.updated_at;
        existing.firstSessionId = raw.session_id;
      }
    }
  }

  const clients = Array.from(clientMap.values()).sort(
    (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="mt-1 text-rocket-muted">
          Local businesses you serve with the 4-Part Revenue System.
        </p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">No clients yet</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              Clients appear here once you create a campaign. Start a new campaign for a local business.
            </p>
            <Link
              href="/dashboard/campaigns/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-rocket-blue px-4 py-2 text-sm font-medium text-white hover:bg-rocket-blue/90"
            >
              <Megaphone className="h-4 w-4" />
              New Campaign
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.key} className="group hover:border-rocket-blue/40 transition-colors">
              <CardContent className="p-5">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  {client.logoUrl ? (
                    <Image
                      src={client.logoUrl}
                      alt={client.businessName}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-md object-contain border border-rocket-border bg-white shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-rocket-bg border border-rocket-border">
                      <span className="text-sm font-bold text-rocket-blue">
                        {client.businessName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-rocket-dark leading-tight">
                      {client.businessName}
                    </h3>
                    {client.industry && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {client.industry}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-rocket-muted">
                    {client.campaignCount} campaign{client.campaignCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-rocket-muted">
                    {new Date(client.lastActive).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/dashboard/campaigns?business=${encodeURIComponent(client.businessName)}`}
                    className="flex-1 rounded-md border border-rocket-border bg-rocket-bg px-3 py-1.5 text-center text-xs font-medium text-rocket-dark hover:bg-white hover:border-rocket-blue/50 transition-colors"
                  >
                    View Campaigns
                  </Link>
                  <Link
                    href={`/dashboard/campaigns/new?session=${client.firstSessionId}`}
                    className="flex-1 rounded-md border border-rocket-border bg-rocket-bg px-3 py-1.5 text-center text-xs font-medium text-rocket-dark hover:bg-white hover:border-rocket-blue/50 transition-colors"
                  >
                    Open Last
                  </Link>
                  {client.websiteUrl && (
                    <a
                      href={client.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-rocket-border bg-rocket-bg p-1.5 text-rocket-muted hover:text-rocket-dark hover:bg-white transition-colors"
                      title="Visit website"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
