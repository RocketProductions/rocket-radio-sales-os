import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { UploadedAsset } from "@/types/assets";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const headersList = await headers();
    const tenantId  = url.searchParams.get("tenantId") ?? headersList.get("x-tenant-id") ?? "default";
    const userRole  = headersList.get("x-user-role") ?? "";
    const isSuperAdmin = userRole === "super_admin";

    const category   = url.searchParams.get("category");
    const sessionId  = url.searchParams.get("sessionId");
    const ownerType  = url.searchParams.get("ownerType"); // 'client' | 'agency' | null (all)

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("brand_uploads")
      .select("*")
      .order("created_at", { ascending: false });

    // Scope: super-admin sees everything; others scoped to tenant
    if (!isSuperAdmin) {
      query = query.eq("tenant_id", tenantId);
    }

    if (category)  query = query.eq("category",   category);
    if (sessionId) query = query.eq("session_id", sessionId);
    if (ownerType) query = query.eq("owner_type", ownerType);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as UploadedAsset[];

    // If admin view, enrich with business_name from campaign_sessions
    let sessionMap: Record<string, string> = {};
    if (isSuperAdmin || (!sessionId && !ownerType)) {
      const sessionIds = [...new Set(rows.map((r) => r.session_id).filter(Boolean))] as string[];
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
    }

    // Generate signed URLs for file assets (not notes)
    const assets = await Promise.all(
      rows.map(async (asset) => {
        const enriched = {
          ...asset,
          business_name: asset.session_id ? (sessionMap[asset.session_id] ?? null) : null,
          signedUrl: null as string | null,
        };

        if (asset.category === "note" || !asset.storage_path) return enriched;

        const { data: signedData, error: signError } = await supabase.storage
          .from("brand-uploads")
          .createSignedUrl(asset.storage_path, 3600);

        if (signError) {
          console.error(`Failed to sign URL for ${asset.id}: ${signError.message}`);
          return enriched;
        }

        return { ...enriched, signedUrl: signedData.signedUrl };
      })
    );

    return NextResponse.json({ ok: true, assets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
