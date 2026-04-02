/**
 * /api/prospects
 *
 * GET  — List prospects (filtered by tenant_id from headers, or all for super_admin)
 * POST — Create a new prospect manually
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CreateProspectSchema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  contact_name:  z.string().optional(),
  email:         z.string().email().optional(),
  phone:         z.string().optional(),
  website:       z.string().url().optional().or(z.literal("")),
  industry:      z.string().optional(),
  notes:         z.string().optional(),
  rep_name:      z.string().optional(),
  source:        z.string().optional(),
});

/** GET /api/prospects — list prospects for the current tenant */
export async function GET(req: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id") ?? "";
    const userRole = headersList.get("x-user-role") ?? "";

    const { searchParams } = new URL(req.url);
    const limit    = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset   = parseInt(searchParams.get("offset") ?? "0");
    const industry = searchParams.get("industry");
    const search   = searchParams.get("search");

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("prospects")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Scope to tenant unless super_admin
    if (userRole !== "super_admin" && tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    if (industry) {
      query = query.eq("industry", industry);
    }

    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data, total: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[prospects GET] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/prospects — create a new prospect */
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id") ?? "";
    const userRole = headersList.get("x-user-role") ?? "";

    const body = CreateProspectSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Determine tenant_id: use header value, or null for super_admin creating without one
    const effectiveTenantId =
      tenantId || (userRole === "super_admin" ? null : "");

    if (!effectiveTenantId && userRole !== "super_admin") {
      return NextResponse.json(
        { ok: false, error: "Missing tenant context" },
        { status: 403 },
      );
    }

    const { data: prospect, error: insertError } = await supabase
      .from("prospects")
      .insert({
        tenant_id:     effectiveTenantId || null,
        business_name: body.business_name,
        contact_name:  body.contact_name ?? null,
        email:         body.email ?? null,
        phone:         body.phone ?? null,
        website:       body.website || null,
        industry:      body.industry ?? null,
        notes:         body.notes ?? null,
        rep_name:      body.rep_name ?? null,
        source:        body.source ?? "manual",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[prospects POST] Insert error:", insertError);
      throw new Error(insertError.message);
    }

    console.log(
      `[prospects POST] Created prospect: ${body.business_name} (${(prospect as { id: string }).id})`,
    );

    return NextResponse.json({ ok: true, data: prospect }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: err.errors },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[prospects POST] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
