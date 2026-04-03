import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** GET /api/team/roster — list all team members. Super_admin sees all, others see their org. */
export async function GET() {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role") ?? "";
    const tenantId = headersList.get("x-tenant-id") ?? "";
    const isSuperAdmin = role === "super_admin";

    const supabase = getSupabaseAdmin();

    // Join app_users → org_memberships → organizations
    const query = supabase
      .from("org_memberships")
      .select(`
        id,
        role,
        commission_rate_pct,
        is_active,
        created_at,
        app_users ( id, name, email ),
        organizations ( id, name, tenant_id )
      `)
      .order("created_at", { ascending: false });

    const { data: memberships, error } = await query;
    if (error) throw new Error(error.message);

    // Filter for non-super_admins: only show members in their tenant's orgs
    type Membership = {
      id: string;
      role: string;
      commission_rate_pct: number | null;
      is_active: boolean;
      created_at: string;
      app_users: { id: string; name: string; email: string } | null;
      organizations: { id: string; name: string; tenant_id: string | null } | null;
    };

    let filtered = (memberships ?? []) as unknown as Membership[];

    if (!isSuperAdmin && tenantId) {
      filtered = filtered.filter(
        (m) => m.organizations?.tenant_id === tenantId,
      );
    }

    const roster = filtered.map((m) => ({
      membership_id: m.id,
      user_id: m.app_users?.id ?? null,
      name: m.app_users?.name ?? "Unknown",
      email: m.app_users?.email ?? "",
      role: m.role,
      organization_name: m.organizations?.name ?? "Unknown",
      organization_id: m.organizations?.id ?? null,
      commission_rate_pct: m.commission_rate_pct,
      joined_date: m.created_at,
      is_active: m.is_active,
    }));

    return NextResponse.json({ ok: true, data: roster });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
