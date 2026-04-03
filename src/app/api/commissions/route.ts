import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CommissionPlanSchema = z.object({
  organization_id: z.string().uuid(),
  model: z.enum(["flat", "tiered", "revenue_share", "hybrid"]),
  amount_cents: z.number().int().min(0).optional(),
  revenue_share_pct: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

/** GET /api/commissions — list commission plans for an org */
export async function GET(req: Request) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role") ?? "";
    const tenantId = headersList.get("x-tenant-id") ?? "";
    const isSuperAdmin = role === "super_admin";

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organization_id");

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("commission_plans")
      .select(`
        *,
        organizations ( id, name, tenant_id )
      `)
      .order("created_at", { ascending: false });

    if (orgId) {
      query = query.eq("organization_id", orgId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Filter by tenant if not super_admin
    type PlanRow = {
      id: string;
      organization_id: string;
      model: string;
      amount_cents: number | null;
      revenue_share_pct: number | null;
      notes: string | null;
      created_at: string;
      organizations: { id: string; name: string; tenant_id: string | null } | null;
    };

    let plans = (data ?? []) as unknown as PlanRow[];
    if (!isSuperAdmin && tenantId) {
      plans = plans.filter((p) => p.organizations?.tenant_id === tenantId);
    }

    return NextResponse.json({ ok: true, data: plans });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/commissions — create or update a commission plan */
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role") ?? "";
    const tenantId = headersList.get("x-tenant-id") ?? "";

    if (!["super_admin", "admin", "manager"].includes(role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = CommissionPlanSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Verify org exists and belongs to tenant (unless super_admin)
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, tenant_id")
      .eq("id", body.organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 });
    }

    if (role !== "super_admin" && org.tenant_id !== tenantId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("commission_plans")
      .insert({
        organization_id: body.organization_id,
        model: body.model,
        amount_cents: body.amount_cents ?? null,
        revenue_share_pct: body.revenue_share_pct ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
