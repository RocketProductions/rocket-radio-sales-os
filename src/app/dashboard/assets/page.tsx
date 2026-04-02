import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AssetLibrary } from "@/components/assets/AssetLibrary";
import { AdminAssetLibrary } from "@/components/assets/AdminAssetLibrary";
import type { UploadedAsset } from "@/types/assets";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Brand Asset Library",
};

export default async function AssetsPage() {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id") ?? "default";
  const userRole    = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";
  const isInternal = ["super_admin", "admin", "manager", "rep", "executive"].includes(userRole);

  // External client users: simple asset library
  if (!isInternal) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-rocket-dark">Brand Asset Library</h1>
          <p className="text-rocket-muted">
            Upload logos, photos, documents, and notes to build your brand kit.
          </p>
        </div>
        <AssetLibrary tenantId={tenantId} />
      </div>
    );
  }

  // Internal users: grouped by client with upload per client
  const supabase = getSupabaseAdmin();

  let assetsQuery = supabase
    .from("brand_uploads")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && tenantId !== "default") {
    assetsQuery = assetsQuery.eq("tenant_id", tenantId);
  }

  const { data: rawAssets } = await assetsQuery;

  const assets = (rawAssets ?? []) as UploadedAsset[];

  // Enrich with business names from campaign_sessions
  const sessionIds = [...new Set(assets.map((a) => a.session_id).filter(Boolean))] as string[];
  let sessionMap: Record<string, string> = {};
  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from("campaign_sessions")
      .select("session_id, business_name")
      .in("session_id", sessionIds);
    sessionMap = Object.fromEntries(
      (sessions ?? []).map((s: { session_id: string; business_name: string }) => [
        s.session_id,
        s.business_name,
      ])
    );
  }

  // Generate signed URLs server-side
  const enriched: UploadedAsset[] = await Promise.all(
    assets.map(async (asset) => {
      const withName: UploadedAsset = {
        ...asset,
        owner_type: (asset.owner_type ?? "client") as "client" | "agency",
        business_name: asset.session_id ? (sessionMap[asset.session_id] ?? null) : null,
      };

      if (asset.category === "note" || !asset.storage_path) {
        return { ...withName, signedUrl: null };
      }

      const { data: signed } = await supabase.storage
        .from("brand-uploads")
        .createSignedUrl(asset.storage_path, 3600);

      return { ...withName, signedUrl: signed?.signedUrl ?? null };
    })
  );

  // Fetch all campaign sessions so every client shows up (even with no assets)
  let sessionsQuery = supabase
    .from("campaign_sessions")
    .select("session_id, business_name")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && tenantId !== "default") {
    sessionsQuery = sessionsQuery.eq("tenant_id", tenantId);
  }

  const { data: allSessions } = await sessionsQuery;
  const clients = (allSessions ?? []).map((s: { session_id: string; business_name: string }) => ({
    sessionId: s.session_id,
    businessName: s.business_name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rocket-dark">Brand Asset Library</h1>
        <p className="text-rocket-muted">
          Upload logos, photos, and documents for each client.
        </p>
      </div>
      <AdminAssetLibrary initialAssets={enriched} tenantId={tenantId} clients={clients} />
    </div>
  );
}
