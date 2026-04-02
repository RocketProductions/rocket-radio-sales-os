/**
 * GET /api/cron/ops-report
 *
 * Daily intelligence briefing — sent every morning.
 * Queries all business metrics, Claude analyzes them,
 * and sends a branded email with actionable insights.
 *
 * Vercel Cron: 0 12 * * * (12pm UTC = 8am ET)
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaude } from "@/lib/claude";
import { sendEmailViaResend } from "@/integrations/email";
import { emailWrapper, emailStatCard, emailStatRow, emailSuccess, emailInfo } from "@/lib/emailTemplate";

export const dynamic = "force-dynamic";

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? process.env.REP_NOTIFICATION_EMAIL ?? "christopher.alumbaugh@gmail.com";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  // ── Gather metrics ────────────────────────────────────────────

  // Active campaigns
  const { count: activeCampaigns } = await supabase
    .from("campaign_sessions")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "published"]);

  // Total campaigns
  const { count: totalCampaigns } = await supabase
    .from("campaign_sessions")
    .select("*", { count: "exact", head: true });

  // Leads
  const { data: allLeads } = await supabase
    .from("lp_leads")
    .select("id, status, created_at, extra_fields")
    .gte("created_at", monthAgo.toISOString())
    .order("created_at", { ascending: false });

  const leads = allLeads ?? [];
  const leadsYesterday = leads.filter((l) => new Date(l.created_at) >= yesterday).length;
  const leadsThisWeek = leads.filter((l) => new Date(l.created_at) >= weekAgo).length;
  const leadsThisMonth = leads.length;

  // Lead statuses
  const booked = leads.filter((l) => (l as { status: string }).status === "booked").length;
  const closed = leads.filter((l) => (l as { status: string }).status === "closed").length;
  const contacted = leads.filter((l) => (l as { status: string }).status === "contacted").length;

  // Sources
  const sourceCounts = new Map<string, number>();
  for (const l of leads) {
    const src = (l as { extra_fields: Record<string, string> | null }).extra_fields?.["How did you hear about us?"] ?? "Not specified";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }
  const topSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Get-started prospects
  const prospectLeads = leads.filter((l) =>
    (l as { extra_fields: Record<string, string> | null }).extra_fields?.source === "get-started"
  );

  // Live landing pages
  const { count: liveLPs } = await supabase
    .from("landing_pages")
    .select("*", { count: "exact", head: true })
    .eq("is_live", true);

  // Failed automation runs
  const { count: failedRuns } = await supabase
    .from("automation_runs")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("scheduled_for", weekAgo.toISOString());

  // Pending automation runs (overdue)
  const { count: overdueRuns } = await supabase
    .from("automation_runs")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString());

  // Campaigns with no leads in 7+ days
  const { data: activeSessions } = await supabase
    .from("campaign_sessions")
    .select("session_id, business_name, lp_slug")
    .in("status", ["active", "published"]);

  const staleClients: string[] = [];
  if (activeSessions) {
    for (const session of activeSessions as { session_id: string; business_name: string; lp_slug: string | null }[]) {
      const { data: recentLeads } = await supabase
        .from("lp_leads")
        .select("id")
        .eq("landing_page_id", session.session_id) // approximate — may need LP join
        .gte("created_at", weekAgo.toISOString())
        .limit(1);
      if (!recentLeads || recentLeads.length === 0) {
        staleClients.push(session.business_name);
      }
    }
  }

  // ── Build metrics summary for Claude ──────────────────────────

  const metricsSummary = [
    `=== DAILY OPS REPORT DATA ===`,
    `Date: ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
    ``,
    `CAMPAIGNS: ${activeCampaigns ?? 0} active of ${totalCampaigns ?? 0} total`,
    `LIVE LANDING PAGES: ${liveLPs ?? 0}`,
    ``,
    `LEADS:`,
    `  Yesterday: ${leadsYesterday}`,
    `  This week: ${leadsThisWeek}`,
    `  This month: ${leadsThisMonth}`,
    `  Contacted: ${contacted}`,
    `  Booked: ${booked}`,
    `  Closed: ${closed}`,
    ``,
    `SOURCES: ${topSources.map(([s, c]) => `${s} (${c})`).join(", ") || "No data yet"}`,
    ``,
    `PROSPECTS (from get-started): ${prospectLeads.length} this month`,
    ``,
    `AUTOMATION:`,
    `  Failed runs this week: ${failedRuns ?? 0}`,
    `  Overdue pending runs: ${overdueRuns ?? 0}`,
    ``,
    `AT-RISK CLIENTS (no leads in 7+ days): ${staleClients.length > 0 ? staleClients.join(", ") : "None"}`,
  ].join("\n");

  // ── Claude analysis ───────────────────────────────────────────

  let analysis: string;
  try {
    analysis = await askClaude(
      `You are an operations analyst for a radio advertising platform called Rocket Radio Sales. You write concise, actionable daily briefings for the platform owner. No fluff. Use bullet points. Be specific about what to do.`,
      `Analyze these metrics and write a 3-section briefing:\n\n${metricsSummary}\n\nSections:\n1. WHAT'S WORKING (2-3 bullets — positive trends, wins)\n2. WHAT NEEDS ATTENTION (2-3 bullets — problems, risks, declining metrics)\n3. ACTION ITEMS (2-3 bullets — specific things to do TODAY)\n\nIf there's very little data, say so honestly and focus on what to prioritize to get the first clients.\n\nKeep the entire response under 300 words. No headers — just the 3 sections with clear labels.`,
      { maxTokens: 1024, temperature: 0.3 },
    );
  } catch (err) {
    analysis = `⚠️ Claude analysis unavailable: ${err instanceof Error ? err.message : "Unknown error"}\n\nRaw metrics:\n${metricsSummary}`;
  }

  // ── Format and send email ─────────────────────────────────────

  const statsHtml = emailStatRow([
    emailStatCard(leadsYesterday, "Leads Yesterday"),
    emailStatCard(leadsThisWeek, "This Week"),
    emailStatCard(activeCampaigns ?? 0, "Active Campaigns"),
  ]);

  const analysisHtml = analysis
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("1.") || trimmed.startsWith("WHAT'S WORKING"))
        return `<p style="margin: 16px 0 4px; font-size: 13px; font-weight: 700; color: #1B7A4A;">&#x2713; WHAT'S WORKING</p>`;
      if (trimmed.startsWith("2.") || trimmed.startsWith("WHAT NEEDS ATTENTION"))
        return `<p style="margin: 16px 0 4px; font-size: 13px; font-weight: 700; color: #C53030;">&#x26A0; WHAT NEEDS ATTENTION</p>`;
      if (trimmed.startsWith("3.") || trimmed.startsWith("ACTION ITEMS"))
        return `<p style="margin: 16px 0 4px; font-size: 13px; font-weight: 700; color: #0B1D3A;">&#x2192; ACTION ITEMS</p>`;
      if (trimmed.startsWith("-") || trimmed.startsWith("•"))
        return `<p style="margin: 2px 0; font-size: 13px; color: #5C6370; padding-left: 12px;">${trimmed}</p>`;
      return `<p style="margin: 2px 0; font-size: 13px; color: #5C6370;">${trimmed}</p>`;
    })
    .join("");

  const riskHtml = staleClients.length > 0
    ? emailInfo(`<strong>At-risk clients:</strong> ${staleClients.join(", ")} — no leads in 7+ days`)
    : emailSuccess("All active campaigns received leads this week.");

  const htmlBody = emailWrapper(
    `Daily Ops Report — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    `
      ${statsHtml}
      ${analysisHtml}
      ${riskHtml}
    `
  );

  const plainBody = `Daily Ops Report\n\n${metricsSummary}\n\n---\n\n${analysis}`;

  await sendEmailViaResend({
    to: OWNER_EMAIL,
    subject: `📊 Ops Report: ${leadsYesterday} leads yesterday, ${activeCampaigns ?? 0} campaigns active`,
    body: plainBody,
    htmlBody,
  });

  return NextResponse.json({ ok: true, metrics: { leadsYesterday, leadsThisWeek, activeCampaigns, staleClients: staleClients.length } });
}
