import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmailViaResend } from "@/integrations/email";
import { emailWrapper, emailButton } from "@/lib/emailTemplate";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "rep", "agency_admin"]),
  organization_id: z.string().uuid(),
  commission_rate_pct: z.number().min(0).max(100).optional(),
});

/** POST /api/team/invite — send a team invite */
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id") ?? "";
    const userRole = headersList.get("x-user-role") ?? "";
    const tenantId = headersList.get("x-tenant-id") ?? "";

    // Only admins, managers, and super_admins can invite
    if (!["super_admin", "admin", "manager"].includes(userRole)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = InviteSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Verify the organization exists
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, tenant_id")
      .eq("id", body.organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 });
    }

    // Non-super_admins can only invite to their own tenant's orgs
    if (userRole !== "super_admin" && org.tenant_id !== tenantId) {
      return NextResponse.json({ ok: false, error: "Forbidden — cannot invite to another tenant's org" }, { status: 403 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { data: invite, error: insertError } = await supabase
      .from("team_invites")
      .insert({
        email: body.email,
        role: body.role,
        organization_id: body.organization_id,
        commission_rate_pct: body.commission_rate_pct ?? null,
        token,
        invited_by: userId,
        expires_at: expiresAt,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    // Send invite email
    const inviteUrl = `${BASE_URL}/invite/${token}`;
    const htmlBody = emailWrapper(
      "You're Invited to Join the Team",
      `
        <p style="font-size: 14px; color: #0B1D3A; margin: 0 0 12px;">
          You've been invited to join <strong>${org.name}</strong> on Rocket Radio Sales as a <strong>${body.role}</strong>.
        </p>
        <p style="font-size: 13px; color: #5C6370; margin: 0 0 20px;">
          Click below to set up your account and get started.
        </p>
        ${emailButton("Accept Invite", inviteUrl)}
        <p style="font-size: 11px; color: #5C6370; margin: 20px 0 0; text-align: center;">
          This invite expires in 7 days.
        </p>
      `,
    );

    await sendEmailViaResend({
      to: body.email,
      subject: `You're invited to join ${org.name} on Rocket Radio`,
      body: `You've been invited to join ${org.name} as a ${body.role}. Accept here: ${inviteUrl}`,
      htmlBody,
      tenantId,
    });

    return NextResponse.json({ ok: true, data: invite }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
