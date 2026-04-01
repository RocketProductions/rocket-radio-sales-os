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

    const htmlBody = `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 18px;">Weekly Report for ${businessName}</h2>
          <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">
            Week of ${startOfThisWeek.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">

          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${thisCount}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">New Leads</div>
              <div style="font-size: 11px; color: ${trend >= 0 ? "#22c55e" : "#ef4444"}; margin-top: 4px;">${trendText}</div>
            </div>
            <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${booked}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Booked</div>
            </div>
            <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${closed}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Closed</div>
            </div>
          </div>

          ${bestDay ? `<p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">Best day: <strong style="color: #0f172a;">${bestDay[0]}</strong> (${bestDay[1]} lead${bestDay[1] !== 1 ? "s" : ""})</p>` : ""}
          ${topSource && topSource[0] !== "Not specified" ? `<p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">Top source: <strong style="color: #0f172a;">${topSource[0]}</strong> (${topSource[1]})</p>` : ""}

          <div style="margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 13px; color: #166534;">
            &#x2713; Every lead received an instant response from your campaign.
          </div>

          <p style="margin-top: 16px; font-size: 13px; color: #64748b;">
            View all leads and details in your <strong>Your Leads</strong> dashboard.
          </p>
        </div>
      </div>
    `;

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
