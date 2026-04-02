/**
 * GET /api/cron/monthly-report
 *
 * Sends each client a branded monthly performance summary on the 1st.
 * Includes lead stats, source breakdown, estimated revenue/ROI, and
 * a Claude-written personalized insight paragraph.
 *
 * Vercel Cron: 0 14 1 * * (10am ET on the 1st of each month)
 * Capped at 50 emails per run to stay within Resend limits.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaude } from "@/lib/claude";
import { sendEmailViaResend } from "@/integrations/email";
import {
  emailWrapper,
  emailStatCard,
  emailStatRow,
  emailButton,
  emailInfo,
} from "@/lib/emailTemplate";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";
const TIER_PRICES: Record<string, number> = { starter: 497, growth: 1497, scale: 2997 };
const MAX_EMAILS = 50;

export async function GET() {
  const supabase = getSupabaseAdmin();

  // ── Date range: previous calendar month ──────────────────────
  const now = new Date();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = startOfLastMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // 1. Get all tenants with active subscriptions
  const { data: activeSubs } = await supabase
    .from("subscriptions")
    .select("tenant_id, plan")
    .eq("status", "active");

  if (!activeSubs || activeSubs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no active subscriptions" });
  }

  let totalSent = 0;

  for (const sub of activeSubs as { tenant_id: string; plan: string }[]) {
    if (totalSent >= MAX_EMAILS) break;

    const tenantId = sub.tenant_id;
    const tier = sub.plan;

    // 2. Get client_owner users
    const { data: owners } = await supabase
      .from("app_users")
      .select("email, name")
      .eq("tenant_id", tenantId)
      .eq("role", "client_owner");

    if (!owners || owners.length === 0) continue;

    // Get tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    const tenantName = (tenant as { name: string } | null)?.name ?? "Your Business";

    // Get campaign sessions for this tenant
    const { data: sessions } = await supabase
      .from("campaign_sessions")
      .select("session_id, business_name, intake_form")
      .eq("tenant_id", tenantId);

    if (!sessions || sessions.length === 0) continue;

    const sessionIds = sessions.map((s: { session_id: string }) => s.session_id);
    const businessName =
      (sessions[0] as { business_name: string }).business_name ?? tenantName;

    // Get avg ticket from intake_form
    let avgTicket = 0;
    for (const s of sessions as { intake_form: Record<string, string> | null }[]) {
      const t = parseFloat(s.intake_form?.avgTicket ?? "0");
      if (t > 0) {
        avgTicket = t;
        break;
      }
    }

    // Get landing pages
    const { data: lps } = await supabase
      .from("landing_pages")
      .select("id")
      .in("session_id", sessionIds);

    if (!lps || lps.length === 0) continue;

    const lpIds = lps.map((lp: { id: string }) => lp.id);

    // 3. Calculate last month's metrics
    const { data: monthLeads } = await supabase
      .from("lp_leads")
      .select("id, status, created_at, extra_fields")
      .in("landing_page_id", lpIds)
      .gte("created_at", startOfLastMonth.toISOString())
      .lt("created_at", endOfLastMonth.toISOString());

    const leads = (monthLeads ?? []) as {
      id: string;
      status: string;
      created_at: string;
      extra_fields: Record<string, string> | null;
    }[];

    const totalLeads = leads.length;
    if (totalLeads === 0) continue; // Skip tenants with no leads last month

    const booked = leads.filter(
      (l) => l.status === "booked" || l.status === "closed",
    ).length;
    const closed = leads.filter((l) => l.status === "closed").length;

    // Leads by source
    const sourceCounts = new Map<string, number>();
    for (const l of leads) {
      const src =
        l.extra_fields?.["How did you hear about us?"] ?? "Not specified";
      sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    }
    const sourceEntries = [...sourceCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    );

    // Estimated revenue and ROI
    const estimatedRevenue = avgTicket > 0 ? closed * avgTicket : 0;
    const monthlyPrice = TIER_PRICES[tier] ?? 0;
    const roi =
      monthlyPrice > 0 && estimatedRevenue > 0
        ? Math.round((estimatedRevenue / monthlyPrice) * 100) / 100
        : 0;

    // 4. Claude personalized summary
    let summary: string;
    try {
      summary = await askClaude(
        `You are a friendly account strategist for Rocket Radio, a local radio advertising platform. Write a 2-3 sentence personalized monthly summary for a client. Be encouraging but honest. Mention specific numbers. Do not use emojis.`,
        `Business: ${businessName}\nMonth: ${monthLabel}\nTotal leads: ${totalLeads}\nBooked: ${booked}\nClosed: ${closed}\nEstimated revenue: $${estimatedRevenue.toLocaleString()}\nTop source: ${sourceEntries[0]?.[0] ?? "N/A"} (${sourceEntries[0]?.[1] ?? 0} leads)\nROI: ${roi}x\nTier: ${tier}`,
        { maxTokens: 256, temperature: 0.4 },
      );
    } catch {
      summary = `In ${monthLabel}, your campaign generated ${totalLeads} lead${totalLeads !== 1 ? "s" : ""}, with ${booked} booked and ${closed} closed.${estimatedRevenue > 0 ? ` Estimated revenue: $${estimatedRevenue.toLocaleString()}.` : ""}`;
    }

    // 5. Build branded email
    const revenueDisplay =
      estimatedRevenue > 0
        ? `$${estimatedRevenue.toLocaleString()}`
        : "N/A";

    const statsHtml = emailStatRow([
      emailStatCard(totalLeads, "Leads"),
      emailStatCard(booked, "Booked"),
      emailStatCard(closed, "Closed"),
      emailStatCard(revenueDisplay, "Est. Revenue"),
    ]);

    // Source breakdown table
    const sourceRows = sourceEntries
      .slice(0, 5)
      .map(
        ([src, count]) => `
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8;">${src}</td>
          <td style="padding: 6px 0; font-size: 13px; color: #0B1D3A; text-align: right; border-bottom: 1px solid #E5E1D8;">${count} lead${count !== 1 ? "s" : ""}</td>
        </tr>`,
      )
      .join("");

    const sourceTable = sourceRows
      ? `
        <p style="margin: 20px 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #5C6370; font-weight: 600;">Lead Sources</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          ${sourceRows}
        </table>`
      : "";

    const roiLine =
      roi > 0
        ? emailInfo(
            `<strong>${roi}x ROI</strong> — your $${monthlyPrice}/mo investment generated an estimated $${estimatedRevenue.toLocaleString()} in revenue.`,
          )
        : "";

    const htmlBody = emailWrapper(
      `${monthLabel} Report for ${businessName}`,
      `
        ${statsHtml}
        <p style="margin: 0 0 20px; font-size: 14px; color: #0B1D3A; line-height: 1.6;">${summary}</p>
        ${sourceTable}
        ${roiLine}
        ${emailButton("View Full Report", `${BASE_URL}/portal`)}
      `,
    );

    const plainBody = [
      `${monthLabel} Report for ${businessName}`,
      ``,
      `Leads: ${totalLeads}  |  Booked: ${booked}  |  Closed: ${closed}`,
      estimatedRevenue > 0
        ? `Est. Revenue: $${estimatedRevenue.toLocaleString()}  |  ROI: ${roi}x`
        : "",
      ``,
      summary,
      ``,
      sourceEntries.length > 0 ? "Lead Sources:" : "",
      ...sourceEntries.slice(0, 5).map(([src, cnt]) => `  ${src}: ${cnt}`),
      ``,
      `View full report: ${BASE_URL}/portal`,
    ]
      .filter(Boolean)
      .join("\n");

    const subject = `Your ${monthLabel} results: ${totalLeads} lead${totalLeads !== 1 ? "s" : ""}${closed > 0 ? `, ${closed} closed` : ""}`;

    // 6. Send to each owner (respecting cap)
    for (const owner of owners as { email: string; name: string | null }[]) {
      if (totalSent >= MAX_EMAILS) break;
      if (!owner.email) continue;

      await sendEmailViaResend({
        to: owner.email,
        subject,
        body: plainBody,
        htmlBody,
        tenantId,
      });
      totalSent++;
    }
  }

  return NextResponse.json({ ok: true, sent: totalSent, month: monthLabel });
}
