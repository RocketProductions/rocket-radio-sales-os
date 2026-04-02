/**
 * GET /api/cron/weekly-digest
 *
 * Sends a weekly performance email to every client_owner user.
 * Triggered by Vercel Cron every Monday at 9am ET.
 *
 * Email content:
 *   - Leads this week vs last week
 *   - Booked / closed counts
 *   - Best day of the week
 *   - Top referral source
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmailViaResend } from "@/integrations/email";
import { emailWrapper, emailStatCard, emailStatRow, emailSuccess, emailButton, emailRow } from "@/lib/emailTemplate";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay() - 7); // Last Monday
  startOfThisWeek.setHours(0, 0, 0, 0);

  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 7);

  const startOfPrevWeek = new Date(startOfThisWeek);
  startOfPrevWeek.setDate(startOfThisWeek.getDate() - 7);

  // Get all tenants with active subscriptions or any leads
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name");

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no tenants" });
  }

  let totalSent = 0;

  for (const tenant of tenants as { id: string; name: string }[]) {
    // Get client_owner users
    const { data: owners } = await supabase
      .from("app_users")
      .select("email, name")
      .eq("tenant_id", tenant.id)
      .eq("role", "client_owner");

    if (!owners || owners.length === 0) continue;

    // Get session IDs for this tenant
    const { data: sessions } = await supabase
      .from("campaign_sessions")
      .select("session_id, business_name")
      .eq("tenant_id", tenant.id);

    if (!sessions || sessions.length === 0) continue;

    const sessionIds = sessions.map((s: { session_id: string }) => s.session_id);

    // Get landing pages
    const { data: lps } = await supabase
      .from("landing_pages")
      .select("id")
      .in("session_id", sessionIds);

    if (!lps || lps.length === 0) continue;

    const lpIds = lps.map((lp: { id: string }) => lp.id);

    // Get leads for this week and last week
    const { data: thisWeekLeads } = await supabase
      .from("lp_leads")
      .select("id, status, created_at, extra_fields")
      .in("landing_page_id", lpIds)
      .gte("created_at", startOfThisWeek.toISOString())
      .lt("created_at", endOfThisWeek.toISOString());

    const { data: prevWeekLeads } = await supabase
      .from("lp_leads")
      .select("id")
      .in("landing_page_id", lpIds)
      .gte("created_at", startOfPrevWeek.toISOString())
      .lt("created_at", startOfThisWeek.toISOString());

    const leads = (thisWeekLeads ?? []) as { id: string; status: string; created_at: string; extra_fields: Record<string, string> | null }[];
    const prevCount = (prevWeekLeads ?? []).length;
    const thisCount = leads.length;

    if (thisCount === 0 && prevCount === 0) continue;

    const booked = leads.filter((l) => l.status === "booked" || l.status === "closed").length;
    const closed = leads.filter((l) => l.status === "closed").length;

    // Best day
    const dayCounts = new Map<string, number>();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const l of leads) {
      const day = dayNames[new Date(l.created_at).getDay()];
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }
    const bestDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    // Top source
    const sourceCounts = new Map<string, number>();
    for (const l of leads) {
      const src = l.extra_fields?.["How did you hear about us?"] ?? "Not specified";
      sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    }
    const topSource = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    const trend = thisCount - prevCount;
    const trendText = trend > 0 ? `+${trend} from last week` : trend < 0 ? `${trend} from last week` : "Same as last week";
    const businessName = (sessions[0] as { business_name: string }).business_name ?? tenant.name;

    const subject = `Your weekly leads report: ${thisCount} lead${thisCount !== 1 ? "s" : ""} this week`;

    const portalUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";
    const weekLabel = startOfThisWeek.toLocaleDateString("en-US", { month: "long", day: "numeric" });

    const statsHtml = emailStatRow([
      emailStatCard(thisCount, "New Leads", trendText),
      emailStatCard(booked, "Booked"),
      emailStatCard(closed, "Closed"),
    ]);

    const detailRows = [
      bestDay ? emailRow("Best day", `${bestDay[0]} (${bestDay[1]} lead${bestDay[1] !== 1 ? "s" : ""})`) : "",
      topSource && topSource[0] !== "Not specified" ? emailRow("Top source", `${topSource[0]} (${topSource[1]})`) : "",
    ].filter(Boolean).join("");

    const htmlBody = emailWrapper(
      `Weekly Report for ${businessName}`,
      `
        <p style="margin: 0 0 16px; font-size: 13px; color: #5C6370;">Week of ${weekLabel}</p>
        ${statsHtml}
        ${detailRows ? `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">${detailRows}</table>` : ""}
        ${emailSuccess("Every lead received an instant response from your campaign.")}
        ${emailButton("View Your Dashboard", `${portalUrl}/portal`)}
      `
    );

    const plainBody = [
      `Weekly Report for ${businessName}`,
      `Week of ${startOfThisWeek.toLocaleDateString()}`,
      ``,
      `${thisCount} new leads (${trendText})`,
      `${booked} booked, ${closed} closed`,
      bestDay ? `Best day: ${bestDay[0]} (${bestDay[1]} leads)` : "",
      topSource && topSource[0] !== "Not specified" ? `Top source: ${topSource[0]} (${topSource[1]})` : "",
      ``,
      `Every lead received an instant response from your campaign.`,
    ].filter(Boolean).join("\n");

    for (const owner of owners as { email: string; name: string | null }[]) {
      if (!owner.email) continue;
      await sendEmailViaResend({
        to: owner.email,
        subject,
        body: plainBody,
        htmlBody,
        tenantId: tenant.id,
      });
      totalSent++;
    }
  }

  return NextResponse.json({ ok: true, sent: totalSent });
}
