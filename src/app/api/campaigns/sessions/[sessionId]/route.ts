import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PatchSchema = z.object({
  status:     z.enum(["active", "archived"]).optional(),
  lpSlug:     z.string().optional(),
  lpLive:     z.boolean().optional(),
  assetCount: z.number().int().nonnegative().optional(),
});

// ── GET — load a single session with its assets and brand kit ─────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const headersList   = await headers();
    const tenantId      = headersList.get("x-tenant-id") ?? "";
    const userId        = headersList.get("x-user-id")   ?? "";
    const userRole      = headersList.get("x-user-role") ?? "";

    const supabase = getSupabaseAdmin();

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from("campaign_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    const row = session as {
      session_id: string;
      tenant_id: string | null;
      user_id: string | null;
      business_name: string;
      brand_kit_id: string | null;
      lp_slug: string | null;
      lp_live: boolean;
      intake_form: Record<string, string> | null;
      status: string;
    };

    // Ownership check
    const isSuperAdmin = userRole === "super_admin";
    const isOwnTenant  = row.tenant_id === tenantId;
    const isOwnUser    = row.user_id === userId;
    if (!isSuperAdmin && !isOwnTenant && !isOwnUser) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Fetch all assets for this session, most recent per type
    const { data: assets } = await supabase
      .from("campaign_assets")
      .select("id, asset_type, status, content, edited_content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    // Keep only the most recent asset of each type
    const latestByType: Record<string, { id: string; asset_type: string; status: string; content: unknown; edited_content: unknown }> = {};
    for (const asset of assets ?? []) {
      const a = asset as { id: string; asset_type: string; status: string; content: unknown; edited_content: unknown };
      if (!latestByType[a.asset_type]) latestByType[a.asset_type] = a;
    }

    // Fetch brand kit if linked
    let brandKit = null;
    if (row.brand_kit_id) {
      const { data: kit } = await supabase
        .from("brand_kits")
        .select(
          "id, website_url, business_description, tagline, logo_url, primary_color, secondary_color, accent_color, font_headline, font_body, tone_words, key_phrases, target_audience, unique_value_prop, industry"
        )
        .eq("id", row.brand_kit_id)
        .single();

      if (kit) {
        const k = kit as {
          business_description: string;
          tagline: string | null;
          logo_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          accent_color: string | null;
          font_headline: string | null;
          font_body: string | null;
          tone_words: string[];
          key_phrases: string[];
          target_audience: string;
          unique_value_prop: string;
          industry: string;
        };
        brandKit = {
          businessDescription: k.business_description,
          tagline:             k.tagline,
          logoUrl:             k.logo_url,
          primaryColor:        k.primary_color,
          secondaryColor:      k.secondary_color,
          accentColor:         k.accent_color,
          fontSuggestions:     { headline: k.font_headline, body: k.font_body },
          toneWords:           k.tone_words ?? [],
          keyPhrases:          k.key_phrases ?? [],
          targetAudience:      k.target_audience,
          uniqueValueProp:     k.unique_value_prop,
          industry:            k.industry,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      session: {
        sessionId:    row.session_id,
        businessName: row.business_name,
        brandKitId:   row.brand_kit_id,
        lpSlug:       row.lp_slug,
        lpLive:       row.lp_live,
        intakeForm:   row.intake_form ?? {},
        status:       row.status,
      },
      assets: latestByType,
      brandKit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// ── PATCH — update session status / lp fields ─────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const headersList   = await headers();
    const tenantId      = headersList.get("x-tenant-id") ?? "";

    const body     = PatchSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Validate tenant ownership
    const { data: existing, error: fetchError } = await supabase
      .from("campaign_sessions")
      .select("id, tenant_id")
      .eq("session_id", sessionId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    const row = existing as { id: string; tenant_id: string | null };

    if (tenantId && row.tenant_id && row.tenant_id !== tenantId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Build update payload
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status     !== undefined) updates.status      = body.status;
    if (body.lpSlug     !== undefined) updates.lp_slug     = body.lpSlug;
    if (body.lpLive     !== undefined) updates.lp_live     = body.lpLive;
    if (body.assetCount !== undefined) updates.asset_count = body.assetCount;

    const { error: updateError } = await supabase
      .from("campaign_sessions")
      .update(updates)
      .eq("session_id", sessionId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
