/**
 * GET /api/cron/campaign-refresh
 *
 * Campaign Refresh Prompt — runs weekly.
 *
 * Finds campaigns active for 60+ days and generates a refresh suggestion
 * via Claude based on the current season and industry. Saves the suggestion
 * to client_alerts so the rep can act on it.
 *
 * Capped at 5 per run.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaude } from "@/lib/claude";
import { sendEmailViaResend } from "@/integrations/email";
import { emailWrapper, emailInfo, emailButton } from "@/lib/emailTemplate";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 5;
const REP_EMAIL = process.env.REP_NOTIFICATION_EMAIL ?? "christopher.alumbaugh@gmail.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";

/** Get the current season based on month */
function getCurrentSeason(): string {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  try {
    // 1. Find active campaigns older than 60 days
    const { data: staleCampaigns, error: campaignError } = await supabase
      .from("campaign_sessions")
      .select("session_id, business_name, intake_form, tenant_id, created_at")
      .eq("status", "active")
      .lte("created_at", sixtyDaysAgo.toISOString())
      .limit(20); // Fetch extra, we'll filter below

    if (campaignError) {
      console.error("[campaign-refresh] Query error:", campaignError);
      return NextResponse.json({ ok: false, error: campaignError.message }, { status: 500 });
    }

    if (!staleCampaigns || staleCampaigns.length === 0) {
      console.log("[campaign-refresh] No campaigns eligible for refresh");
      return NextResponse.json({ ok: true, suggestions: 0, reason: "none eligible" });
    }

    // 2. Filter out campaigns that already have a recent refresh alert (last 30 days)
    const sessionIds = staleCampaigns.map((c: { session_id: string }) => c.session_id);
    const { data: recentAlerts } = await supabase
      .from("client_alerts")
      .select("campaign_session_id")
      .in("campaign_session_id", sessionIds)
      .eq("alert_type", "campaign_refresh")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const recentlyAlertedIds = new Set(
      (recentAlerts ?? []).map((a: { campaign_session_id: string }) => a.campaign_session_id),
    );

    const eligible = staleCampaigns.filter(
      (c: { session_id: string }) => !recentlyAlertedIds.has(c.session_id),
    );

    if (eligible.length === 0) {
      console.log("[campaign-refresh] All stale campaigns already have recent refresh alerts");
      return NextResponse.json({ ok: true, suggestions: 0, reason: "all already flagged" });
    }

    // 3. Generate refresh suggestions (cap at MAX_PER_RUN)
    const toProcess = eligible.slice(0, MAX_PER_RUN) as unknown as {
      session_id: string;
      business_name: string;
      intake_form: Record<string, string> | null;
      tenant_id: string | null;
      created_at: string;
    }[];

    const season = getCurrentSeason();
    let suggestionsCreated = 0;
    const suggestionSummaries: { business: string; suggestion: string }[] = [];

    for (const campaign of toProcess) {
      const daysActive = Math.floor(
        (now.getTime() - new Date(campaign.created_at).getTime()) / 86400000,
      );

      try {
        const suggestion = await askClaude(
          "You are a radio advertising campaign strategist. Suggest a creative refresh for a campaign that has been running unchanged. Consider seasonal relevance, fresh angles, and new offers. Be specific and actionable. Max 3 sentences.",
          `Business: ${campaign.business_name}\nIndustry: ${(campaign.intake_form as Record<string, string> | null)?.industry ?? "local business"}\nCurrent season: ${season}\nDays active: ${daysActive}\n\nSuggest a campaign refresh that feels timely and fresh.`,
          { maxTokens: 256, temperature: 0.5 },
        );

        // Save to client_alerts
        const { error: insertError } = await supabase.from("client_alerts").insert({
          campaign_session_id: campaign.session_id,
          tenant_id: campaign.tenant_id,
          alert_type: "campaign_refresh",
          severity: "info",
          message: `Campaign has been running for ${daysActive} days — time for a refresh.`,
          recommendation: suggestion.trim(),
        });

        if (insertError) {
          console.error(
            `[campaign-refresh] Insert error for campaign ${campaign.session_id}:`,
            insertError,
          );
          continue;
        }

        suggestionsCreated++;
        suggestionSummaries.push({
          business: campaign.business_name,
          suggestion: suggestion.trim(),
        });

        console.log(
          `[campaign-refresh] Refresh suggestion created for ${campaign.business_name} (${daysActive} days active)`,
        );
      } catch (err) {
        console.error(`[campaign-refresh] Claude error for campaign ${campaign.session_id}:`, err);
      }
    }

    // 4. Send summary email to rep
    if (suggestionsCreated > 0) {
      const rows = suggestionSummaries
        .map(
          (s) => `
          <tr>
            <td style="padding: 10px 0; font-weight: 600; font-size: 14px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8; vertical-align: top; width: 140px;">${s.business}</td>
            <td style="padding: 10px 0; font-size: 13px; color: #5C6370; border-bottom: 1px solid #E5E1D8;">${s.suggestion}</td>
          </tr>`,
        )
        .join("");

      const htmlBody = emailWrapper(
        `${suggestionsCreated} Campaign${suggestionsCreated !== 1 ? "s" : ""} Ready for a Refresh`,
        `
          <p style="margin: 0 0 16px; font-size: 14px; color: #0B1D3A;">
            ${suggestionsCreated} campaign${suggestionsCreated !== 1 ? "s have" : " has"} been running 60+ days with no changes. Here are AI-generated refresh ideas:
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <th style="text-align: left; padding: 8px 0; font-size: 12px; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Business</th>
              <th style="text-align: left; padding: 8px 0; font-size: 12px; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Refresh Suggestion</th>
            </tr>
            ${rows}
          </table>
          ${emailInfo(`It's ${season} — a great time to update creative, offers, and messaging.`)}
          ${emailButton("View Dashboard", `${BASE_URL}/dashboard`)}
        `,
      );

      await sendEmailViaResend({
        to: REP_EMAIL,
        subject: `${suggestionsCreated} campaign${suggestionsCreated !== 1 ? "s" : ""} due for a refresh`,
        body: `${suggestionsCreated} campaigns have been running 60+ days. Log in to see refresh suggestions: ${BASE_URL}/dashboard`,
        htmlBody,
      });
    }

    console.log(
      `[campaign-refresh] Run complete: ${suggestionsCreated} suggestions from ${eligible.length} eligible campaigns`,
    );

    return NextResponse.json({
      ok: true,
      suggestions: suggestionsCreated,
      checked: eligible.length,
    });
  } catch (err) {
    console.error("[campaign-refresh] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
