import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { UploadedAsset } from "@/types/assets";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId =
      url.searchParams.get("tenantId") ?? req.headers.get("x-tenant-id") ?? "default";
    const category = url.searchParams.get("category");
    const sessionId = url.searchParams.get("sessionId");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("brand_uploads")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as UploadedAsset[];

    // Generate signed URLs for file assets (not notes)
    const assets = await Promise.all(
      rows.map(async (asset) => {
        if (asset.category === "note" || !asset.storage_path) {
          return { ...asset, signedUrl: null };
        }

        const { data: signedData, error: signError } = await supabase.storage
          .from("brand-uploads")
          .createSignedUrl(asset.storage_path, 3600);

        if (signError) {
          console.error(`Failed to sign URL for ${asset.id}: ${signError.message}`);
          return { ...asset, signedUrl: null };
        }

        return { ...asset, signedUrl: signedData.signedUrl };
      })
    );

    return NextResponse.json({ ok: true, assets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
