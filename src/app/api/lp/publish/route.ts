import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPlanLimits } from "@/lib/planLimits";

const Schema = z.object({
  sessionId:       z.string().uuid(),
  assetId:         z.string().uuid(),
  brandKitId:      z.string().uuid().optional(),
  slug:            z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  businessName:    z.string().optional(),
  replaceExisting: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body      = Schema.parse(await req.json());
    const supabase  = getSupabaseAdmin();

    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id") ?? "";

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

    // ── LP limit enforcement ──────────────────────────────────────────────────
    if (tenantId) {
      // Get plan tier
      const { data: tenant } = await supabase
        .from("tenants")
        .select("plan_tier")
        .eq("id", tenantId)
        .single();

      const planTier = (tenant as { plan_tier?: string } | null)?.plan_tier ?? "starter";
      const limits   = getPlanLimits(planTier);

      // Get extra LP slot add-ons for this tenant
      const { data: addonRows } = await supabase
        .from("lp_slot_addons")
        .select("slots")
        .eq("tenant_id", tenantId);

      const extraSlots = (addonRows ?? []).reduce(
        (sum: number, r: { slots: number }) => sum + (r.slots ?? 0),
        0
      );

      const totalLpLimit = limits.lpsPerBrand + extraSlots;

      // Count currently live LPs for this tenant
      const { data: livePages } = await supabase
        .from("landing_pages")
        .select("id, business_name")
        .eq("is_live", true)
        .in(
          "session_id",
          // sub-select: all session_ids for this tenant
          await (async () => {
            const { data: tenantSessions } = await supabase
              .from("campaign_sessions")
              .select("session_id")
              .eq("tenant_id", tenantId);
            return (tenantSessions ?? []).map((s: { session_id: string }) => s.session_id);
          })()
        );

      const liveLpCount = (livePages ?? []).length;

      // Does this exact business already have a live LP?
      const businessAlreadyLive = (livePages ?? []).some(
        (p: { business_name: string | null }) =>
          (p.business_name ?? "").toLowerCase() ===
          (body.businessName ?? "").toLowerCase()
      );

      if (liveLpCount >= totalLpLimit && !businessAlreadyLive) {
        if (!body.replaceExisting) {
          return NextResponse.json(
            {
              ok: false,
              error: "LP_LIMIT_REACHED",
              message:
                "You already have a live landing page. Publishing this one will replace it. Pass replaceExisting: true to confirm.",
            },
            { status: 403 }
          );
        }

        // replaceExisting: true — unpublish all other LPs for this tenant
        const tenantSessionIds = (
          await supabase
            .from("campaign_sessions")
            .select("session_id")
            .eq("tenant_id", tenantId)
        ).data?.map((s: { session_id: string }) => s.session_id) ?? [];

        if (tenantSessionIds.length > 0) {
          await supabase
            .from("landing_pages")
            .update({ is_live: false })
            .in("session_id", tenantSessionIds)
            .neq("slug", body.slug); // keep the one we're about to publish

          await supabase
            .from("campaign_sessions")
            .update({ lp_live: false, updated_at: new Date().toISOString() })
            .eq("tenant_id", tenantId)
            .eq("lp_live", true)
            .neq("session_id", body.sessionId);
        }
      } else if (businessAlreadyLive) {
        // Replacing same business LP — unpublish that business's current LP(s)
        const tenantSessionIds = (
          await supabase
            .from("campaign_sessions")
            .select("session_id")
            .eq("tenant_id", tenantId)
        ).data?.map((s: { session_id: string }) => s.session_id) ?? [];

        if (tenantSessionIds.length > 0) {
          await supabase
            .from("landing_pages")
            .update({ is_live: false })
            .in("session_id", tenantSessionIds)
            .ilike("business_name", body.businessName ?? "")
            .neq("slug", body.slug);

          await supabase
            .from("campaign_sessions")
            .update({ lp_live: false, updated_at: new Date().toISOString() })
            .eq("tenant_id", tenantId)
            .ilike("business_name", body.businessName ?? "")
            .eq("lp_live", true)
            .neq("session_id", body.sessionId);
        }
      }
    }

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
          slug:          body.slug,
          session_id:    body.sessionId,
          asset_id:      body.assetId,
          brand_kit_id:  body.brandKitId ?? null,
          business_name: body.businessName ?? null,
          content,
          brand_colors:  brandColors,
          is_live:       true,
          published_at:  new Date().toISOString(),
          updated_at:    new Date().toISOString(),
        },
        { onConflict: "slug" }
      )
      .select("id, slug")
      .single();

    if (upsertError) throw new Error(upsertError.message);

    // Update the campaign session with LP info
    await supabase
      .from("campaign_sessions")
      .update({
        lp_slug:    body.slug,
        lp_live:    true,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", body.sessionId);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocket-radio-sales-os.vercel.app";
    const liveUrl = `${baseUrl}/lp/${body.slug}`;

    return NextResponse.json({ ok: true, id: (page as { id: string }).id, slug: body.slug, liveUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
