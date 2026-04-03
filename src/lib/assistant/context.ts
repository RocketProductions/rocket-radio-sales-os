/**
 * assistant/context.ts — Builds a real-time platform status string for the AI assistant.
 *
 * Queries Supabase for alerts, leads, campaigns, invites, drafts,
 * content suggestions, failed automations, and hot prospects.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function buildAssistantContext(
  tenantId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
): Promise<string> {
  const sb = getSupabaseAdmin();

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel
  const [
    alertsRes,
    leads24hRes,
    leads7dRes,
    campaignsRes,
    invitesRes,
    outreachRes,
    contentRes,
    failedAutoRes,
    hotProspectsRes,
  ] = await Promise.all([
    // Unresolved client alerts
    sb
      .from("client_alerts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("resolved", false),

    // Leads last 24h
    sb
      .from("lp_leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", yesterday),

    // Leads last 7d
    sb
      .from("lp_leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", lastWeek),

    // Active campaigns
    sb
      .from("campaign_sessions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active"),

    // Pending team invites
    sb
      .from("team_invites")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending"),

    // Pending outreach emails
    sb
      .from("outreach_emails")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "draft"),

    // Pending content suggestions
    sb
      .from("content_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending"),

    // Failed automations (7d)
    sb
      .from("automation_runs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "failed")
      .gte("created_at", lastWeek),

    // Hot prospects (triage_score >= 8)
    sb
      .from("prospects")
      .select("name, triage_score")
      .eq("tenant_id", tenantId)
      .gte("triage_score", 8)
      .order("triage_score", { ascending: false })
      .limit(10),
  ]);

  const alerts = alertsRes.count ?? 0;
  const leads24h = leads24hRes.count ?? 0;
  const leads7d = leads7dRes.count ?? 0;
  const campaigns = campaignsRes.count ?? 0;
  const invites = invitesRes.count ?? 0;
  const outreach = outreachRes.count ?? 0;
  const content = contentRes.count ?? 0;
  const failedAuto = failedAutoRes.count ?? 0;

  const hotList =
    hotProspectsRes.data && hotProspectsRes.data.length > 0
      ? hotProspectsRes.data
          .map(
            (p: { name: string; triage_score: number }) =>
              `${p.name} (${p.triage_score}/10)`,
          )
          .join(", ")
      : "None";

  return [
    "=== PLATFORM STATUS ===",
    `Unresolved alerts: ${alerts}`,
    `Leads (24h): ${leads24h} | Leads (7d): ${leads7d}`,
    `Active campaigns: ${campaigns}`,
    `Pending invites: ${invites}`,
    `Outreach drafts pending approval: ${outreach}`,
    `Content suggestions pending: ${content}`,
    `Failed automations (7d): ${failedAuto}`,
    `Hot prospects: ${hotList}`,
  ].join("\n");
}
