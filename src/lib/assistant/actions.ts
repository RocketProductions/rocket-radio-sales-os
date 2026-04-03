/**
 * assistant/actions.ts — Executes tool calls requested by the AI assistant.
 *
 * Each function queries Supabase and returns a formatted text result
 * that Claude can relay to the user.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  switch (name) {
    case "query_leads":
      return queryLeads(input, tenantId);
    case "query_campaigns":
      return queryCampaigns(input, tenantId);
    case "query_metrics":
      return queryMetrics(input, tenantId);
    case "navigate_to":
      return navigateTo(input);
    case "list_alerts":
      return listAlerts(tenantId);
    default:
      return `Unknown tool: ${name}`;
  }
}

/* ── Tool implementations ────────────────────────────────────────────── */

async function queryLeads(
  input: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  const sb = getSupabaseAdmin();
  const days = (input.days as number) ?? 7;
  const status = input.status as string | undefined;
  const search = input.search as string | undefined;

  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();

  let query = sb
    .from("lp_leads")
    .select("id, name, email, phone, status, created_at, landing_pages(business_name)")
    .eq("tenant_id", tenantId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5);

  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, count, error } = await query;

  if (error) return `Error querying leads: ${error.message}`;
  if (!data || data.length === 0) return `No leads found in the last ${days} days.`;

  const lines = data.map((l) => {
    const biz =
      l.landing_pages &&
      typeof l.landing_pages === "object" &&
      "business_name" in l.landing_pages
        ? (l.landing_pages as { business_name: string }).business_name
        : "Unknown";
    return `- ${l.name ?? "Unnamed"} | ${biz} | ${l.status} | ${l.email ?? "no email"} | ${new Date(l.created_at).toLocaleDateString()}`;
  });

  return [
    `Leads (last ${days}d): ${count ?? data.length} total, showing top ${data.length}:`,
    ...lines,
  ].join("\n");
}

async function queryCampaigns(
  input: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  const sb = getSupabaseAdmin();
  const status = input.status as string | undefined;

  let query = sb
    .from("campaign_sessions")
    .select("id, business_name, status, objective, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) return `Error querying campaigns: ${error.message}`;
  if (!data || data.length === 0) return "No campaigns found.";

  const lines = data.map(
    (c) =>
      `- ${c.business_name ?? "Untitled"} | ${c.status} | ${c.objective ?? "—"} | ${new Date(c.created_at).toLocaleDateString()}`,
  );

  return [`Campaigns (${data.length} shown):`, ...lines].join("\n");
}

async function queryMetrics(
  input: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  const sb = getSupabaseAdmin();
  const period = (input.period as string) ?? "week";

  let since: string;
  const now = new Date();

  switch (period) {
    case "today":
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      break;
    case "week":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case "month":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
    default:
      since = "2000-01-01T00:00:00Z";
  }

  // Count leads by status
  const [totalRes, newRes, qualifiedRes, wonRes] = await Promise.all([
    sb
      .from("lp_leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", since),
    sb
      .from("lp_leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "new")
      .gte("created_at", since),
    sb
      .from("lp_leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "qualified")
      .gte("created_at", since),
    sb
      .from("lp_leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "won")
      .gte("created_at", since),
  ]);

  const total = totalRes.count ?? 0;
  const newCount = newRes.count ?? 0;
  const qualified = qualifiedRes.count ?? 0;
  const won = wonRes.count ?? 0;
  const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : "0";

  return [
    `=== Metrics (${period}) ===`,
    `Total leads: ${total}`,
    `New: ${newCount} | Qualified: ${qualified} | Won: ${won}`,
    `Conversion rate (won/total): ${conversionRate}%`,
  ].join("\n");
}

function navigateTo(input: Record<string, unknown>): string {
  const page = input.page as string;
  const id = input.id as string | undefined;

  const routes: Record<string, string> = {
    dashboard: "/dashboard",
    leads: "/dashboard/leads",
    campaigns: "/dashboard/campaigns",
    prospects: "/dashboard/prospects",
    settings: "/dashboard/settings",
    proposals: "/dashboard/proposals",
    content: "/dashboard/content",
    reports: "/dashboard/reports",
  };

  const base = routes[page] ?? "/dashboard";
  const url = id ? `${base}/${id}` : base;

  return JSON.stringify({ action: "navigate", url });
}

async function listAlerts(tenantId: string): Promise<string> {
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("client_alerts")
    .select("id, alert_type, message, severity, recommendation, created_at")
    .eq("tenant_id", tenantId)
    .eq("resolved", false)
    .order("severity", { ascending: false })
    .limit(10);

  if (error) return `Error querying alerts: ${error.message}`;
  if (!data || data.length === 0) return "No unresolved alerts. Everything looks good!";

  const lines = data.map(
    (a) =>
      `- [${a.severity?.toUpperCase() ?? "INFO"}] ${a.alert_type}: ${a.message}${a.recommendation ? `\n  Recommendation: ${a.recommendation}` : ""}`,
  );

  return [`Unresolved alerts (${data.length}):`, ...lines].join("\n");
}
