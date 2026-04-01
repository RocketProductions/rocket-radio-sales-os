/**
 * Single proposal API
 *
 * GET   /api/proposals/[id]  — fetch one proposal
 * PATCH /api/proposals/[id]  — update status, tier, or any content field
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PatchSchema = z.object({
  title:            z.string().min(1).optional(),
  status:           z.enum(["draft", "ready", "sent"]).optional(),
  tier:             z.enum(["starter", "growth", "scale"]).optional(),
  bigIdea:          z.string().optional(),
  offerText:        z.string().optional(),
  radioScript:      z.string().optional(),
  funnelHeadline:   z.string().optional(),
  funnelBody:       z.string().optional(),
  followUpSummary:  z.string().optional(),
  notes:            z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("proposals")
      .select(`
        id, title, status, tier,
        big_idea, offer_text, radio_script,
        funnel_headline, funnel_body, follow_up_summary,
        notes, created_at, updated_at, session_id, tenant_id,
        campaign_sessions ( business_name, brand_kit_id )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = PatchSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title           !== undefined) updates.title             = body.title;
    if (body.status          !== undefined) updates.status            = body.status;
    if (body.tier            !== undefined) updates.tier              = body.tier;
    if (body.bigIdea         !== undefined) updates.big_idea          = body.bigIdea;
    if (body.offerText       !== undefined) updates.offer_text        = body.offerText;
    if (body.radioScript     !== undefined) updates.radio_script      = body.radioScript;
    if (body.funnelHeadline  !== undefined) updates.funnel_headline   = body.funnelHeadline;
    if (body.funnelBody      !== undefined) updates.funnel_body       = body.funnelBody;
    if (body.followUpSummary !== undefined) updates.follow_up_summary = body.followUpSummary;
    if (body.notes           !== undefined) updates.notes             = body.notes;

    const { data, error } = await supabase
      .from("proposals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
