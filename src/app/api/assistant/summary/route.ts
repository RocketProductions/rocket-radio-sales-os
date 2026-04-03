/**
 * GET /api/assistant/summary — Returns an attention-needed briefing for the current user.
 *
 * Reads the auth-token cookie to identify the tenant, then queries
 * platform status via buildAssistantContext().
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const tenantId = payload.tenantId;
    const sb = getSupabaseAdmin();

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [alertsRes, leads24hRes, outreachRes, contentRes, hotProspectsRes] =
      await Promise.all([
        sb
          .from("client_alerts")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("resolved", false),
        sb
          .from("lp_leads")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", yesterday),
        sb
          .from("outreach_emails")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "draft"),
        sb
          .from("content_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "pending"),
        sb
          .from("prospects")
          .select("name, triage_score")
          .eq("tenant_id", tenantId)
          .gte("triage_score", 8)
          .order("triage_score", { ascending: false })
          .limit(5),
      ]);

    const sections: Array<Record<string, unknown>> = [];

    const alertCount = alertsRes.count ?? 0;
    if (alertCount > 0) {
      sections.push({
        type: "alerts",
        count: alertCount,
        label: "Campaigns need attention",
      });
    }

    const leadCount = leads24hRes.count ?? 0;
    if (leadCount > 0) {
      sections.push({
        type: "leads",
        count: leadCount,
        label: "New leads today",
      });
    }

    const draftCount = outreachRes.count ?? 0;
    if (draftCount > 0) {
      sections.push({
        type: "drafts",
        count: draftCount,
        label: "Outreach drafts to review",
      });
    }

    const contentCount = contentRes.count ?? 0;
    if (contentCount > 0) {
      sections.push({
        type: "content",
        count: contentCount,
        label: "Content suggestions pending",
      });
    }

    if (hotProspectsRes.data && hotProspectsRes.data.length > 0) {
      sections.push({
        type: "hot",
        items: hotProspectsRes.data.map(
          (p: { name: string; triage_score: number }) =>
            `${p.name} (${p.triage_score}/10)`,
        ),
        label: "Hot prospects",
      });
    }

    return NextResponse.json({ ok: true, sections });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
