/**
 * Proposals API
 *
 * GET  /api/proposals   — list proposals for this tenant
 * POST /api/proposals   — create a new proposal
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CreateProposalSchema = z.object({
  sessionId:        z.string().min(1),
  title:            z.string().min(1),
  tier:             z.enum(["starter", "growth", "scale"]).default("starter"),
  bigIdea:          z.string().optional(),
  offerText:        z.string().optional(),
  radioScript:      z.string().optional(),
  funnelHeadline:   z.string().optional(),
  funnelBody:       z.string().optional(),
  followUpSummary:  z.string().optional(),
  notes:            z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId  = headersList.get("x-tenant-id") ?? "";
    const userRole  = headersList.get("x-user-role") ?? "";
    const isSuperAdmin = userRole === "super_admin";

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("proposals")
      .select(`
        id, title, status, tier, big_idea, created_at, updated_at, session_id,
        campaign_sessions ( business_name )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    } else if (!isSuperAdmin && tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id") ?? "";

    const body = CreateProposalSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const { data: proposal, error } = await supabase
      .from("proposals")
      .insert({
        session_id:        body.sessionId,
        tenant_id:         tenantId || null,
        title:             body.title,
        tier:              body.tier,
        status:            "draft",
        big_idea:          body.bigIdea ?? null,
        offer_text:        body.offerText ?? null,
        radio_script:      body.radioScript ?? null,
        funnel_headline:   body.funnelHeadline ?? null,
        funnel_body:       body.funnelBody ?? null,
        follow_up_summary: body.followUpSummary ?? null,
        notes:             body.notes ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, proposal }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("parse") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
