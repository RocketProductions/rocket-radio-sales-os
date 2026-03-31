import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const Schema = z.object({
  sessionId: z.string().uuid(),
  assetId: z.string().uuid(),
  brandKitId: z.string().uuid().optional(),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  businessName: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Fetch the funnel-copy asset
    const { data: asset, error: assetError } = await supabase
      .from("campaign_assets")
      .select("content, edited_content, status")
      .eq("id", body.assetId)
      .single();

    if (assetError || !asset) throw new Error("Asset not found");

    const a = asset as { content: Record<string, unknown>; edited_content?: Record<string, unknown>; status: string };

    // Use edited content if available, otherwise original
    const content = a.edited_content ?? a.content;

    // Fetch brand kit colors
    let brandColors: Record<string, string> = {};
    if (body.brandKitId) {
      const { data: kit } = await supabase
        .from("brand_kits")
        .select("primary_color, secondary_color, accent_color, logo_url, business_name, tagline")
        .eq("id", body.brandKitId)
        .single();
      if (kit) {
        const k = kit as Record<string, string | null>;
        brandColors = {
          primaryColor:   k.primary_color   ?? "#1e40af",
          secondaryColor: k.secondary_color ?? "#0f172a",
          accentColor:    k.accent_color    ?? "#f97316",
          logoUrl:        k.logo_url        ?? "",
          tagline:        k.tagline         ?? "",
        };
      }
    }

    // Upsert landing page (slug must be unique — fail gracefully)
    const { data: page, error: upsertError } = await supabase
      .from("landing_pages")
      .upsert(
        {
          slug: body.slug,
          session_id: body.sessionId,
          asset_id: body.assetId,
          brand_kit_id: body.brandKitId ?? null,
          business_name: body.businessName ?? null,
          content,
          brand_colors: brandColors,
          is_live: true,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      )
      .select("id, slug")
      .single();

    if (upsertError) throw new Error(upsertError.message);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocket-radio-sales-os.vercel.app";
    const liveUrl = `${baseUrl}/lp/${body.slug}`;

    return NextResponse.json({ ok: true, id: (page as { id: string }).id, slug: body.slug, liveUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
