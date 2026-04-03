/**
 * GET /api/cron/outreach-followup
 *
 * Automated follow-up engine. Runs on a cron schedule to generate
 * follow-up emails for outreach that was sent 5+ days ago with no reply.
 *
 * - Finds sent emails where sent_at >= 5 days ago, no reply, sequence_step = 1
 * - Claude generates a shorter, more direct follow-up (different angle)
 * - Saves as a new outreach_email with sequence_step = 2, status = "draft"
 * - Capped at 10 per run to avoid overloading
 *
 * Vercel Cron: 0 14 * * 1-5 (2pm UTC = 10am ET, weekdays)
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaudeJson } from "@/lib/claude";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 10;

const FOLLOWUP_SYSTEM_PROMPT = `You write follow-up cold outreach emails for a radio advertising platform called Rocket Radio Sales. This is a second touch — the first email got no reply. Take a different angle. Be shorter (under 80 words), more direct, and add urgency without being pushy. Reference the first email casually. Never say "just following up" or "circling back." Sign off as the rep's name.

Respond with JSON only, no markdown fences:
{ "subject": "string", "body": "string (use \\n for paragraph breaks)" }`;

interface FollowupEmail {
  subject: string;
  body: string;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);

  // 1. Find outreach emails eligible for follow-up
  //    status = "sent", sent_at <= 5 days ago, sequence_step = 1, no reply
  const { data: eligibleEmails, error: queryError } = await supabase
    .from("outreach_emails")
    .select(`
      id, prospect_id, rep_id, tenant_id, subject, body, sent_at,
      prospects ( business_name, contact_name, website, industry )
    `)
    .eq("status", "sent")
    .eq("sequence_step", 1)
    .is("replied_at", null)
    .lte("sent_at", fiveDaysAgo.toISOString())
    .limit(MAX_PER_RUN);

  if (queryError) {
    console.error("[outreach-followup] Query error:", queryError);
    return NextResponse.json(
      { ok: false, error: queryError.message },
      { status: 500 },
    );
  }

  if (!eligibleEmails || eligibleEmails.length === 0) {
    console.log("[outreach-followup] No emails eligible for follow-up");
    return NextResponse.json({ ok: true, generated: 0, reason: "none eligible" });
  }

  // 2. Check that we haven't already generated a step-2 for each
  let generated = 0;

  for (const email of eligibleEmails) {
    const e = email as {
      id: string;
      prospect_id: string;
      tenant_id: string | null;
      subject: string;
      body: string;
      rep_id: string | null;
      sent_at: string;
      prospects: {
        business_name: string;
        contact_name: string | null;
        website: string | null;
        industry: string | null;
      }[] | null;
    };

    // Skip if a follow-up already exists for this prospect at step 2
    const { data: existing } = await supabase
      .from("outreach_emails")
      .select("id")
      .eq("prospect_id", e.prospect_id)
      .eq("sequence_step", 2)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const prospect = e.prospects?.[0] ?? null;
    const repName = "Chris"; // TODO: look up rep name from app_users via e.rep_id

    // 3. Generate follow-up via Claude
    try {
      const userMessage = [
        `Original email subject: "${e.subject}"`,
        `Original email body: "${e.body}"`,
        `Business: ${prospect?.business_name ?? "Unknown"}`,
        `Contact: ${prospect?.contact_name ?? "Business Owner"}`,
        `Industry: ${prospect?.industry ?? "unknown"}`,
        `Days since sent: ${Math.floor((now.getTime() - new Date(e.sent_at).getTime()) / 86400000)}`,
        `Rep name: ${repName}`,
      ].join("\n");

      const followup = await askClaudeJson<FollowupEmail>(
        FOLLOWUP_SYSTEM_PROMPT,
        userMessage,
        { maxTokens: 512, temperature: 0.5 },
      );

      // 4. Save as new outreach_email with sequence_step = 2
      const { error: insertError } = await supabase
        .from("outreach_emails")
        .insert({
          prospect_id: e.prospect_id,
          tenant_id: e.tenant_id,
          subject: followup.subject,
          body: followup.body,
          status: "draft",
          sequence_step: 2,
          rep_id: e.rep_id,
          parent_email_id: e.id,
        });

      if (insertError) {
        console.error(
          `[outreach-followup] Insert error for prospect ${e.prospect_id}:`,
          insertError,
        );
        continue;
      }

      generated++;
      console.log(
        `[outreach-followup] Follow-up draft created for ${prospect?.business_name ?? e.prospect_id}: "${followup.subject}"`,
      );
    } catch (err) {
      console.error(
        `[outreach-followup] Claude error for prospect ${e.prospect_id}:`,
        err,
      );
    }
  }

  console.log(
    `[outreach-followup] Run complete: ${generated} follow-ups generated from ${eligibleEmails.length} eligible`,
  );

  return NextResponse.json({ ok: true, generated, checked: eligibleEmails.length });
}
