import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CreateOrgSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  org_type: z.enum(["platform", "media_company", "agency"]),
  tenant_id: z.string().uuid(),
  parent_org_id: z.string().uuid().optional(),
});

/** GET /api/organizations — list orgs. Super_admin sees all, others see their tenant's orgs. */
export async function GET() {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role") ?? "";
    const tenantId = headersList.get("x-tenant-id") ?? "";
    const isSuperAdmin = role === "super_admin";

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isSuperAdmin) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/organizations — create org (super_admin only). */
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role") ?? "";

    if (role !== "super_admin") {
      return NextResponse.json({ ok: false, error: "Forbidden — super_admin only" }, { status: 403 });
    }

    const body = CreateOrgSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: body.name,
        slug: body.slug,
        org_type: body.org_type,
        tenant_id: body.tenant_id,
        parent_org_id: body.parent_org_id ?? null,
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
