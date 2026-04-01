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

  // Non-admins: keep the original simple asset library
  if (!isSuperAdmin) {
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

  // Admin: load ALL assets with session info, then group client-side
  const supabase = getSupabaseAdmin();

  const { data: rawAssets } = await supabase
    .from("brand_uploads")
    .select("*")
    .order("created_at", { ascending: false });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rocket-dark">Brand Asset Library</h1>
        <p className="text-rocket-muted">
          Agency-owned assets and client media — organised by business.
        </p>
      </div>
      <AdminAssetLibrary initialAssets={enriched} tenantId={tenantId} />
    </div>
  );
}
