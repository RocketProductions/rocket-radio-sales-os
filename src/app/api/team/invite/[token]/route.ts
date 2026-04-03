import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/auth";

const AcceptSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

interface RouteParams {
  params: Promise<{ token: string }>;
}

/** GET /api/team/invite/[token] — validate token, return invite details if valid */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { token } = await params;
    const supabase = getSupabaseAdmin();

    const { data: invite, error } = await supabase
      .from("team_invites")
      .select(`
        id, email, role, commission_rate_pct, status, expires_at,
        organizations ( id, name, org_type )
      `)
      .eq("token", token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
    }

    if (invite.status === "accepted") {
      return NextResponse.json({ ok: false, error: "This invite has already been accepted" }, { status: 410 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: "This invite has expired" }, { status: 410 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        email: invite.email,
        role: invite.role,
        organization: invite.organizations,
        commission_rate_pct: invite.commission_rate_pct,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/team/invite/[token] — accept invite, create user + org membership */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = AcceptSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Fetch invite with org details
    const { data: invite, error: inviteError } = await supabase
      .from("team_invites")
      .select(`
        id, email, role, commission_rate_pct, status, expires_at, organization_id,
        organizations ( id, name, tenant_id )
      `)
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
    }

    if (invite.status === "accepted") {
      return NextResponse.json({ ok: false, error: "This invite has already been accepted" }, { status: 410 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: "This invite has expired" }, { status: 410 });
    }

    const org = invite.organizations as unknown as { id: string; name: string; tenant_id: string } | null;
    const tenantId = org?.tenant_id ?? null;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("app_users")
      .select("id")
      .ilike("email", invite.email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new app_user
      userId = randomUUID();
      const passwordHash = await hashPassword(body.password);

      const { error: userError } = await supabase
        .from("app_users")
        .insert({
          id: userId,
          email: invite.email,
          name: body.name,
          tenant_id: tenantId,
          role: invite.role,
          password_hash: passwordHash,
        });

      if (userError) throw new Error(userError.message);
    }

    // Create org_membership
    const { error: memberError } = await supabase
      .from("org_memberships")
      .insert({
        user_id: userId,
        organization_id: invite.organization_id,
        role: invite.role,
        commission_rate_pct: invite.commission_rate_pct ?? null,
        is_active: true,
      });

    if (memberError) throw new Error(memberError.message);

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from("team_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true, data: { userId, email: invite.email } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
