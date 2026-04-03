/**
 * GET /api/cron/reactivation
 *
 * Lost Lead Reactivation — runs weekly.
 *
 * Finds leads marked "lost" that are 30+ days old, generates a friendly
 * reactivation text draft via Claude, and saves it for rep review.
 * Does NOT auto-send — the rep reviews each draft first.
 *
 * Capped at 10 per run.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaude } from "@/lib/claude";
import { sendEmailViaResend } from "@/integrations/email";
import { emailWrapper, emailInfo, emailButton } from "@/lib/emailTemplate";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 10;
const REP_EMAIL = process.env.REP_NOTIFICATION_EMAIL ?? "christopher.alumbaugh@gmail.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  try {
    // 1. Find lost leads older than 30 days
    const { data: lostLeads, error: leadsError } = await supabase
      .from("lp_leads")
      .select(`
        id, name, phone, created_at, landing_page_id,
        landing_pages ( business_name )
      `)
      .eq("status", "lost")
      .lte("created_at", thirtyDaysAgo.toISOString())
      .limit(50); // Fetch extra, we'll filter below

    if (leadsError) {
      console.error("[reactivation] Query error:", leadsError);
      return NextResponse.json({ ok: false, error: leadsError.message }, { status: 500 });
    }

    if (!lostLeads || lostLeads.length === 0) {
      console.log("[reactivation] No lost leads eligible for reactivation");
      return NextResponse.json({ ok: true, drafts: 0, reason: "none eligible" });
    }

    // 2. Filter out leads that already have a reactivation event
    const leadIds = lostLeads.map((l: { id: string }) => l.id);
    const { data: existingEvents } = await supabase
      .from("lead_events")
      .select("lead_id")
      .in("lead_id", leadIds)
      .eq("event_type", "reactivation_sent");

    const alreadySentIds = new Set(
      (existingEvents ?? []).map((e: { lead_id: string }) => e.lead_id),
    );

    // Also exclude leads with existing drafts
    const { data: existingDrafts } = await supabase
      .from("lead_events")
      .select("lead_id")
      .in("lead_id", leadIds)
      .eq("event_type", "reactivation_draft");

    const alreadyDraftedIds = new Set(
      (existingDrafts ?? []).map((e: { lead_id: string }) => e.lead_id),
    );

    const eligible = lostLeads.filter(
      (l: { id: string }) => !alreadySentIds.has(l.id) && !alreadyDraftedIds.has(l.id),
    );

    if (eligible.length === 0) {
      console.log("[reactivation] All lost leads already have reactivation events");
      return NextResponse.json({ ok: true, drafts: 0, reason: "all already processed" });
    }

    // 3. Generate reactivation drafts (cap at MAX_PER_RUN)
    const toProcess = eligible.slice(0, MAX_PER_RUN) as {
      id: string;
      name: string | null;
      phone: string | null;
      created_at: string;
      landing_page_id: string;
      landing_pages: { business_name: string }[] | null;
    }[];

    let draftsCreated = 0;
    const draftSummaries: { name: string; business: string; message: string }[] = [];

    for (const lead of toProcess) {
      const businessName =
        (Array.isArray(lead.landing_pages) ? lead.landing_pages[0]?.business_name : null) ?? "your business";
      const firstName = lead.name?.split(" ")[0] ?? "there";

      try {
        const message = await askClaude(
          "You write short, friendly text messages for a local business lead reactivation campaign. Keep it warm and non-pushy. Never use ALL CAPS or exclamation marks excessively.",
          `Write a friendly, non-pushy reactivation text for a lead who showed interest 30+ days ago. Business: ${businessName}. Use their first name: ${firstName}. Under 160 characters.`,
          { maxTokens: 128, temperature: 0.6 },
        );

        // Trim to 160 chars if Claude went over
        const trimmedMessage = message.trim().slice(0, 160);

        // Save draft to lead_events
        const { error: insertError } = await supabase.from("lead_events").insert({
          lead_id: lead.id,
          event_type: "reactivation_draft",
          message: `Reactivation draft created for rep review`,
          metadata: {
            draft_message: trimmedMessage,
            business_name: businessName,
            first_name: firstName,
            phone: lead.phone,
          },
        });

        if (insertError) {
          console.error(`[reactivation] Insert error for lead ${lead.id}:`, insertError);
          continue;
        }

        draftsCreated++;
        draftSummaries.push({
          name: lead.name ?? firstName,
          business: businessName,
          message: trimmedMessage,
        });

        console.log(`[reactivation] Draft created for ${firstName} (${businessName}): "${trimmedMessage}"`);
      } catch (err) {
        console.error(`[reactivation] Claude error for lead ${lead.id}:`, err);
      }
    }

    // 4. Send summary email to rep if any drafts were created
    if (draftsCreated > 0) {
      const draftRows = draftSummaries
        .map(
          (d) => `
          <tr>
            <td style="padding: 8px 0; font-weight: 600; font-size: 14px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8;">${d.name}</td>
            <td style="padding: 8px 0; font-size: 13px; color: #5C6370; border-bottom: 1px solid #E5E1D8;">${d.business}</td>
            <td style="padding: 8px 0; font-size: 12px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8; font-style: italic;">"${d.message}"</td>
          </tr>`,
        )
        .join("");

      const htmlBody = emailWrapper(
        `${draftsCreated} Reactivation Draft${draftsCreated !== 1 ? "s" : ""} Ready`,
        `
          <p style="margin: 0 0 16px; font-size: 14px; color: #0B1D3A;">
            ${draftsCreated} lost lead${draftsCreated !== 1 ? "s" : ""} from 30+ days ago ${draftsCreated !== 1 ? "have" : "has"} new reactivation text drafts ready for your review.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <th style="text-align: left; padding: 8px 0; font-size: 12px; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Lead</th>
              <th style="text-align: left; padding: 8px 0; font-size: 12px; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Business</th>
              <th style="text-align: left; padding: 8px 0; font-size: 12px; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Draft Message</th>
            </tr>
            ${draftRows}
          </table>
          ${emailInfo("These are drafts only — no messages have been sent. Review and approve each one from the leads dashboard.")}
          ${emailButton("Review Drafts", `${BASE_URL}/dashboard/leads`)}
        `,
      );

      await sendEmailViaResend({
        to: REP_EMAIL,
        subject: `${draftsCreated} reactivation draft${draftsCreated !== 1 ? "s" : ""} ready for review`,
        body: `${draftsCreated} lost leads have reactivation text drafts ready. Log in to review: ${BASE_URL}/dashboard/leads`,
        htmlBody,
      });
    }

    console.log(`[reactivation] Run complete: ${draftsCreated} drafts from ${eligible.length} eligible leads`);

    return NextResponse.json({
      ok: true,
      drafts: draftsCreated,
      checked: eligible.length,
    });
  } catch (err) {
    console.error("[reactivation] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
