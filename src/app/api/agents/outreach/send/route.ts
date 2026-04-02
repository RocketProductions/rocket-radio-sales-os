/**
 * POST /api/agents/outreach/send
 *
 * Sends an approved outreach email to the prospect.
 * Only sends emails with status "approved" — drafts must be reviewed first.
 *
 * Input: { emailId: string }
 * Output: { ok: true, messageId?: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmailViaResend } from "@/integrations/email";

const Schema = z.object({
  emailId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // 1. Fetch the outreach email record
    const { data: email, error: emailError } = await supabase
      .from("outreach_emails")
      .select("*")
      .eq("id", body.emailId)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { ok: false, error: "Outreach email not found" },
        { status: 404 },
      );
    }

    const e = email as {
      id: string;
      prospect_id: string;
      tenant_id: string | null;
      subject: string;
      body: string;
      status: string;
    };

    // 2. Verify status is "approved"
    if (e.status !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          error: `Email status is "${e.status}" — only approved emails can be sent`,
        },
        { status: 400 },
      );
    }

    // 3. Fetch the prospect's email address
    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .select("email, business_name")
      .eq("id", e.prospect_id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json(
        { ok: false, error: "Prospect not found for this email" },
        { status: 404 },
      );
    }

    const p = prospect as { email: string | null; business_name: string };

    if (!p.email) {
      return NextResponse.json(
        { ok: false, error: "Prospect has no email address on file" },
        { status: 400 },
      );
    }

    // 4. Send via Resend
    const result = await sendEmailViaResend({
      to: p.email,
      subject: e.subject,
      body: e.body,
      tenantId: e.tenant_id ?? undefined,
    });

    if (!result.success) {
      console.error(`[outreach/send] Failed to send to ${p.email}:`, result.error);
      return NextResponse.json(
        { ok: false, error: result.error ?? "Email send failed" },
        { status: 500 },
      );
    }

    // 5. Update status to "sent" and set sent_at
    const { error: updateError } = await supabase
      .from("outreach_emails")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        message_id: result.messageId ?? null,
      })
      .eq("id", e.id);

    if (updateError) {
      console.error("[outreach/send] Update error:", updateError);
    }

    console.log(
      `[outreach/send] Sent to ${p.business_name} (${p.email}): "${e.subject}"`,
    );

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      mode: result.mode,
    });
  } catch (err) {
    console.error("[outreach/send] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
