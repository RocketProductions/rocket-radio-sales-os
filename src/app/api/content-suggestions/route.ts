/**
 * GET  /api/content-suggestions — List pending content suggestions for dashboard
 * POST /api/content-suggestions — Apply or dismiss a suggestion
 *
 * Part of Agent 5: Content Optimization.
 * Allows reps to review AI-generated improvements and apply them
 * to landing page content with one click.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// ─── GET: List pending suggestions ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json({ error: "Missing x-tenant-id header" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get session IDs belonging to this tenant
  const { data: sessions, error: sessionsError } = await supabase
    .from("campaign_sessions")
    .select("session_id")
    .eq("tenant_id", tenantId);

  if (sessionsError) {
    console.error("[content-suggestions] Error fetching sessions:", sessionsError.message);
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const sessionIds = sessions.map((s: { session_id: string }) => s.session_id);

  // Fetch pending suggestions for those sessions
  const { data: suggestions, error: suggestionsError } = await supabase
    .from("content_suggestions")
    .select("id, landing_page_id, session_id, suggestion_type, original_text, suggested_text, reasoning, status, created_at")
    .in("session_id", sessionIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (suggestionsError) {
    console.error("[content-suggestions] Error fetching suggestions:", suggestionsError.message);
    return NextResponse.json({ error: suggestionsError.message }, { status: 500 });
  }

  // Join business_name from landing_pages
  const lpIds = [...new Set((suggestions ?? []).map((s: { landing_page_id: string }) => s.landing_page_id))];

  const lpMap = new Map<string, string>();
  if (lpIds.length > 0) {
    const { data: lps } = await supabase
      .from("landing_pages")
      .select("id, business_name")
      .in("id", lpIds);

    if (lps) {
      for (const lp of lps as { id: string; business_name: string | null }[]) {
        lpMap.set(lp.id, lp.business_name ?? "Unknown Business");
      }
    }
  }

  const enriched = (suggestions ?? []).map((s: {
    id: string;
    landing_page_id: string;
    session_id: string | null;
    suggestion_type: string;
    original_text: string;
    suggested_text: string;
    reasoning: string;
    status: string;
    created_at: string;
  }) => ({
    ...s,
    business_name: lpMap.get(s.landing_page_id) ?? "Unknown Business",
  }));

  return NextResponse.json({ suggestions: enriched });
}

// ─── POST: Apply or dismiss a suggestion ────────────────────────────────────

interface PostBody {
  id: string;
  action: "apply" | "dismiss";
}

export async function POST(request: NextRequest) {
  let body: PostBody;
  try {
    body = await request.json() as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, action } = body;

  if (!id || !action || !["apply", "dismiss"].includes(action)) {
    return NextResponse.json(
      { error: "Required: { id: string, action: 'apply' | 'dismiss' }" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Fetch the suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from("content_suggestions")
    .select("id, landing_page_id, suggestion_type, suggested_text, status")
    .eq("id", id)
    .single();

  if (fetchError || !suggestion) {
    console.error("[content-suggestions] Suggestion not found:", id);
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  const s = suggestion as {
    id: string;
    landing_page_id: string;
    suggestion_type: string;
    suggested_text: string;
    status: string;
  };

  if (s.status !== "pending") {
    return NextResponse.json({ error: `Suggestion already ${s.status}` }, { status: 409 });
  }

  // ─── Dismiss ────────────────────────────────────────────────────────────────
  if (action === "dismiss") {
    const { error: updateError } = await supabase
      .from("content_suggestions")
      .update({ status: "dismissed" })
      .eq("id", id);

    if (updateError) {
      console.error("[content-suggestions] Dismiss error:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[content-suggestions] Dismissed suggestion ${id}`);
    return NextResponse.json({ ok: true, status: "dismissed" });
  }

  // ─── Apply ──────────────────────────────────────────────────────────────────
  // Fetch the landing page
  const { data: lp, error: lpError } = await supabase
    .from("landing_pages")
    .select("id, content")
    .eq("id", s.landing_page_id)
    .single();

  if (lpError || !lp) {
    console.error("[content-suggestions] Landing page not found:", s.landing_page_id);
    return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
  }

  const landingPage = lp as {
    id: string;
    content: Record<string, unknown>;
  };

  // Update the content based on suggestion type
  const updatedContent = { ...landingPage.content };

  switch (s.suggestion_type) {
    case "headline":
      updatedContent.headline = s.suggested_text;
      break;
    case "body":
      updatedContent.subheadline = s.suggested_text;
      break;
    case "cta":
      updatedContent.ctaText = s.suggested_text;
      break;
    case "form":
      // Form suggestions are advisory — store as a note but don't auto-modify fields
      console.log(`[content-suggestions] Form suggestion applied as note for ${s.landing_page_id}`);
      break;
    default:
      console.warn(`[content-suggestions] Unknown suggestion type: ${s.suggestion_type}`);
  }

  // Update landing page content
  if (s.suggestion_type !== "form") {
    const { error: contentError } = await supabase
      .from("landing_pages")
      .update({ content: updatedContent })
      .eq("id", s.landing_page_id);

    if (contentError) {
      console.error("[content-suggestions] Content update error:", contentError.message);
      return NextResponse.json({ error: contentError.message }, { status: 500 });
    }
  }

  // Mark suggestion as applied
  const { error: statusError } = await supabase
    .from("content_suggestions")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", id);

  if (statusError) {
    console.error("[content-suggestions] Status update error:", statusError.message);
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  console.log(`[content-suggestions] Applied ${s.suggestion_type} suggestion ${id} to landing page ${s.landing_page_id}`);
  return NextResponse.json({ ok: true, status: "applied", type: s.suggestion_type });
}
