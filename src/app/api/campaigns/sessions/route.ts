import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPlanLimits } from "@/lib/planLimits";

// ── POST schema ───────────────────────────────────────────────────────────────
const PostSchema = z.object({
  sessionId:    z.string().min(1),
  businessName: z.string().min(1),
  brandKitId:   z.string().uuid().optional(),
  assetCount:   z.number().int().nonnegative().optional(),
  lpSlug:       z.string().optional(),
  lpLive:       z.boolean().optional(),
  intakeForm:   z.record(z.string()).optional(), // full intake form snapshot for resume
});

// ── POST — register/upsert a campaign session ─────────────────────────────────
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId  = headersList.get("x-tenant-id") ?? "";
    const userId    = headersList.get("x-user-id") ?? "";
    const userRole  = headersList.get("x-user-role") ?? "";
    const userEmail = headersList.get("x-user-email") ?? "";

    const body = PostSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // ── Brand limit check (skip for super_admin) ──────────────────────────────
    if (userRole !== "super_admin" && tenantId) {
      // Fetch the tenant's plan tier
      const { data: tenant } = await supabase
        .from("tenants")
        .select("plan_tier")
        .eq("id", tenantId)
        .single();

      const planTier  = (tenant as { plan_tier?: string } | null)?.plan_tier ?? "starter";
      const limits    = getPlanLimits(planTier);

      // Count distinct (lowercased) business_names for this tenant
      const { data: distinctRows } = await supabase
        .from("campaign_sessions")
        .select("business_name")
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      const existingNames: Set<string> = new Set(
        (distinctRows ?? []).map((r: { business_name: string }) =>
          r.business_name.toLowerCase()
        )
      );

      const isExistingBrand = existingNames.has(body.businessName.toLowerCase());

      if (!isExistingBrand && existingNames.size >= limits.brands) {
        const planLabel = planTier.charAt(0).toUpperCase() + planTier.slice(1);
        const nextPlan  = planTier === "starter" ? "Growth" : "Agency";
        return NextResponse.json(
          {
            ok: false,
            error: "BRAND_LIMIT_REACHED",
            limit: limits.brands,
            planTier,
            upgradeMessage: `You've reached your brand limit on the ${planLabel} plan. Upgrade to ${nextPlan} to manage ${planTier === "starter" ? "2" : "unlimited"} brands.`,
          },
          { status: 403 }
        );
      }
    }

    // ── Upsert ────────────────────────────────────────────────────────────────
    const now = new Date().toISOString();

    const { data: session, error } = await (getSupabaseAdmin())
      .from("campaign_sessions")
      .upsert(
        {
          session_id:    body.sessionId,
          user_id:       userId || null,
          tenant_id:     tenantId || null,
          user_email:    userEmail || null,
          business_name: body.businessName,
          brand_kit_id:  body.brandKitId ?? null,
          lp_slug:       body.lpSlug ?? null,
          lp_live:       body.lpLive ?? false,
          asset_count:   body.assetCount ?? 0,
          intake_form:   body.intakeForm ?? null,
          status:        "active",
          updated_at:    now,
        },
        {
          onConflict:           "session_id",
          ignoreDuplicates:     false,
        }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

// ── GET — list sessions (role-aware) ─────────────────────────────────────────
export async function GET() {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id") ?? "";
    const userId   = headersList.get("x-user-id") ?? "";
    const userRole = headersList.get("x-user-role") ?? "";

    const supabase = getSupabaseAdmin();

    // Fetch plan tier for usage bar
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

    // ── Build query based on role ─────────────────────────────────────────────
    let query = supabase
      .from("campaign_sessions")
      .select(
        "id, session_id, user_id, tenant_id, user_email, business_name, brand_kit_id, lp_slug, lp_live, asset_count, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (userRole === "super_admin") {
      // Fetch all — no filter
    } else if (userRole === "admin" || userRole === "manager") {
      query = query.eq("tenant_id", tenantId);
    } else {
      // rep or default: own sessions only
      query = query.eq("user_id", userId);
    }

    const { data: sessions, error } = await query;
    if (error) throw new Error(error.message);

    // Count distinct active brands for this tenant
    const activeSessions = (sessions ?? []).filter(
      (s: { status: string; tenant_id: string | null }) =>
        s.status === "active" && s.tenant_id === tenantId
    );
    const brandCount = new Set(
      activeSessions.map((s: { business_name: string }) =>
        s.business_name.toLowerCase()
      )
    ).size;

    return NextResponse.json({
      ok: true,
      sessions: sessions ?? [],
      planTier,
      brandCount,
      brandLimit: limits.brands,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
