/**
 * /api/stations
 *
 * GET  — List stations (filtered by tenant_id from headers, or all for super_admin)
 * POST — Create a new station
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CreateStationSchema = z.object({
  tenant_id:    z.string().uuid().optional(),
  call_letters: z.string().min(1, "Call letters are required"),
  frequency:    z.string().optional(),
  format:       z.string().optional(),
  market:       z.string().optional(),
  display_name: z.string().optional(),
  website_url:  z.string().url().optional().or(z.literal("")),
  logo_url:     z.string().url().optional().or(z.literal("")),
});

/** GET /api/stations — list stations for the current tenant */
export async function GET(req: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id") ?? "";
    const userRole = headersList.get("x-user-role") ?? "";

    const { searchParams } = new URL(req.url);
    const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const search = searchParams.get("search");

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("stations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Scope to tenant unless super_admin
    if (userRole !== "super_admin" && tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    if (search) {
      query = query.or(
        `call_letters.ilike.%${search}%,display_name.ilike.%${search}%,market.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data, total: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stations GET] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/stations — create a new station */
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id") ?? "";
    const userRole = headersList.get("x-user-role") ?? "";

    const body = CreateStationSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Determine tenant_id: use body value, header value, or null for super_admin
    const effectiveTenantId =
      body.tenant_id ?? (tenantId || (userRole === "super_admin" ? null : ""));

    if (!effectiveTenantId && userRole !== "super_admin") {
      return NextResponse.json(
        { ok: false, error: "Missing tenant context" },
        { status: 403 },
      );
    }

    const { data: station, error: insertError } = await supabase
      .from("stations")
      .insert({
        tenant_id:    effectiveTenantId || null,
        call_letters: body.call_letters,
        frequency:    body.frequency ?? null,
        format:       body.format ?? null,
        market:       body.market ?? null,
        display_name: body.display_name ?? null,
        website_url:  body.website_url || null,
        logo_url:     body.logo_url || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[stations POST] Insert error:", insertError);
      throw new Error(insertError.message);
    }

    console.log(
      `[stations POST] Created station: ${body.call_letters} (${(station as { id: string }).id})`,
    );

    return NextResponse.json({ ok: true, data: station }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: err.errors },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stations POST] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
