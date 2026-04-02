/**
 * GET /api/cron/client-success
 *
 * AI agent that monitors active campaigns for problems.
 * Runs daily after the ops report. Checks each campaign for:
 * - No leads in 7+ days
 * - Failed automations
 * - Subscription issues (past_due)
 *
 * Claude writes a specific recommendation per flagged campaign.
 * Alerts go to the managing rep, not the client.
 *
 * Vercel Cron: 0 13 * * * (1pm UTC = 9am ET, 1hr after ops report)
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaude } from "@/lib/claude";
import { sendEmailViaResend } from "@/integrations/email";
import { emailWrapper, emailInfo, emailButton } from "@/lib/emailTemplate";

export const dynamic = "force-dynamic";

const REP_EMAIL = process.env.REP_NOTIFICATION_EMAIL ?? "christopher.alumbaugh@gmail.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";

interface CampaignCheck {
  sessionId: string;
  businessName: string;
  tenantId: string | null;
  lpSlug: string | null;
  daysSinceLastLead: number | null;
  failedRuns: number;
  subscriptionStatus: string | null;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  // Get all active campaigns
  const { data: sessions } = await supabase
    .from("campaign_sessions")
    .select("session_id, business_name, tenant_id, lp_slug, lp_live")
    .in("status", ["active", "published"]);

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ ok: true, alerts: 0, reason: "no active campaigns" });
  }

  const checks: CampaignCheck[] = [];

  for (const s of sessions as { session_id: string; business_name: string; tenant_id: string | null; lp_slug: string | null; lp_live: boolean }[]) {
    // Days since last lead
    let daysSinceLastLead: number | null = null;
    if (s.lp_slug) {
      const { data: lp } = await supabase
        .from("landing_pages")
        .select("id")
        .eq("slug", s.lp_slug)
        .single();

      if (lp) {
        const { data: lastLead } = await supabase
          .from("lp_leads")
          .select("created_at")
          .eq("landing_page_id", (lp as { id: string }).id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastLead && lastLead.length > 0) {
          const lastDate = new Date((lastLead[0] as { created_at: string }).created_at);
          daysSinceLastLead = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
        }
      }
    }

    // Failed automation runs this week
    const { count: failedRuns } = await supabase
      .from("automation_runs")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("scheduled_for", weekAgo.toISOString());

    // Subscription status
    let subStatus: string | null = null;
    if (s.tenant_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("tenant_id", s.tenant_id)
        .maybeSingle();
      subStatus = (sub as { status: string } | null)?.status ?? null;
    }

    checks.push({
      sessionId: s.session_id,
      businessName: s.business_name,
      tenantId: s.tenant_id,
      lpSlug: s.lp_slug,
      daysSinceLastLead,
      failedRuns: failedRuns ?? 0,
      subscriptionStatus: subStatus,
    });
  }

  // Identify problems
  const flagged = checks.filter((c) =>
    (c.daysSinceLastLead !== null && c.daysSinceLastLead >= 7) ||
    c.failedRuns > 0 ||
    c.subscriptionStatus === "past_due" ||
    c.subscriptionStatus === "canceled"
  );

  if (flagged.length === 0) {
    return NextResponse.json({ ok: true, alerts: 0, reason: "all campaigns healthy" });
  }

  // Get Claude recommendations for each flagged campaign
  let totalAlerts = 0;

  for (const campaign of flagged) {
    const issues: string[] = [];
    if (campaign.daysSinceLastLead !== null && campaign.daysSinceLastLead >= 7) {
      issues.push(`No leads in ${campaign.daysSinceLastLead} days`);
    }
    if (campaign.failedRuns > 0) {
      issues.push(`${campaign.failedRuns} failed automation runs this week`);
    }
    if (campaign.subscriptionStatus === "past_due") {
      issues.push("Subscription payment is past due");
    }
    if (campaign.subscriptionStatus === "canceled") {
      issues.push("Subscription has been canceled");
    }

    const alertType = issues[0].includes("No leads") ? "no_leads"
      : issues[0].includes("failed") ? "automation_failure"
      : "subscription_issue";

    // Check if we already alerted for this campaign + type in the last 3 days
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    const { data: recentAlert } = await supabase
      .from("client_alerts")
      .select("id")
      .eq("campaign_session_id", campaign.sessionId)
      .eq("alert_type", alertType)
      .gte("created_at", threeDaysAgo.toISOString())
      .limit(1);

    if (recentAlert && recentAlert.length > 0) continue; // Already alerted recently

    // Claude recommendation
    let recommendation: string;
    try {
      recommendation = await askClaude(
        `You are a client success advisor for a radio advertising platform. Write one specific, actionable recommendation for a campaign that has problems. Be direct, practical, and specific to the business. Max 2 sentences.`,
        `Campaign: ${campaign.businessName}\nIssues: ${issues.join("; ")}\nLanding page: ${campaign.lpSlug ? `${BASE_URL}/lp/${campaign.lpSlug}` : "not published"}\n\nWhat should the account executive do about this?`,
        { maxTokens: 256, temperature: 0.3 },
      );
    } catch {
      recommendation = `Review ${campaign.businessName}'s campaign — ${issues.join(", ")}.`;
    }

    // Save alert
    await supabase.from("client_alerts").insert({
      campaign_session_id: campaign.sessionId,
      tenant_id: campaign.tenantId,
      alert_type: alertType,
      severity: campaign.subscriptionStatus === "canceled" ? "critical" : "warning",
      message: issues.join(". "),
      recommendation,
    });

    totalAlerts++;
  }

  // Send summary email to rep if there are new alerts
  if (totalAlerts > 0) {
    const alertItems = flagged.slice(0, 10).map((c) => {
      const issues: string[] = [];
      if (c.daysSinceLastLead !== null && c.daysSinceLastLead >= 7) issues.push(`no leads in ${c.daysSinceLastLead}d`);
      if (c.failedRuns > 0) issues.push(`${c.failedRuns} failed automations`);
      if (c.subscriptionStatus === "past_due") issues.push("payment past due");
      if (c.subscriptionStatus === "canceled") issues.push("canceled");
      return `<tr>
        <td style="padding: 8px 0; font-weight: 600; font-size: 14px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8;">${c.businessName}</td>
        <td style="padding: 8px 0; font-size: 13px; color: #C53030; border-bottom: 1px solid #E5E1D8;">${issues.join(", ")}</td>
      </tr>`;
    }).join("");

    const htmlBody = emailWrapper(
      `${totalAlerts} Campaign${totalAlerts !== 1 ? "s" : ""} Need Attention`,
      `
        ${emailInfo(`<strong>${totalAlerts} active campaign${totalAlerts !== 1 ? "s" : ""}</strong> have issues that need your attention.`)}
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <th style="text-align: left; padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Client</th>
            <th style="text-align: left; padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Issue</th>
          </tr>
          ${alertItems}
        </table>
        ${emailButton("View Dashboard", `${BASE_URL}/dashboard`)}
      `
    );

    await sendEmailViaResend({
      to: REP_EMAIL,
      subject: `⚠️ ${totalAlerts} campaign${totalAlerts !== 1 ? "s" : ""} need attention`,
      body: `${totalAlerts} campaigns need attention. Check your dashboard for details.`,
      htmlBody,
    });
  }

  return NextResponse.json({ ok: true, alerts: totalAlerts, checked: checks.length });
}
