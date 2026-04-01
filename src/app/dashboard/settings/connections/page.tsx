import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ConnectionsManager } from "@/components/settings/ConnectionsManager";
import type { SocialAccountSafe } from "@/types/social";

interface PageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

async function fetchConnections(tenantId: string): Promise<SocialAccountSafe[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("social_accounts")
      .select(
        "id, platform, account_name, page_name, page_id, scopes, connected_at, expires_at"
      )
      .eq("tenant_id", tenantId);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      platform: row.platform as SocialAccountSafe["platform"],
      account_name: row.account_name ?? null,
      page_name: row.page_name ?? null,
      page_id: row.page_id ?? null,
      scopes: row.scopes ?? [],
      connected_at: row.connected_at,
      expires_at: row.expires_at ?? null,
      isExpired:
        row.expires_at != null && new Date(row.expires_at) < new Date(),
    }));
  } catch {
    return [];
  }
}

export default async function ConnectionsPage({ searchParams }: PageProps) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id") ?? "default";

  const { connected, error } = await searchParams;
  const connections = await fetchConnections(tenantId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-rocket-dark">
          Social Media Connections
        </h1>
        <p className="mt-1 text-sm text-rocket-muted">
          Connect your social accounts to publish campaign content, sync leads,
          and run ads directly from the dashboard.
        </p>
      </div>

      {/* Error banner from OAuth redirect */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            <span className="font-semibold">Connection error: </span>
            {decodeURIComponent(error)}
          </p>
        </div>
      )}

      <ConnectionsManager
        initialConnections={connections}
        initialSuccess={connected}
      />
    </div>
  );
}
