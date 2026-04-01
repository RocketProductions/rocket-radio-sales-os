/**
 * POST /api/leads/[id]/stop-automation
 *
 * Cancels all pending automation runs for this lead.
 * Called when a rep manually stops follow-up (e.g. lead already booked via phone).
 *
 * PATCH /api/leads/[id]/stop-automation  (single run)
 * Body: { runId: string } — cancel one specific pending step
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST — cancel ALL pending runs for this lead */
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("automation_runs")
      .update({ status: "canceled" })
      .eq("lead_id", id)
      .eq("status", "pending")
      .select("id");

    if (error) throw new Error(error.message);

    const canceledCount = (data ?? []).length;

    // Log the cancellation as a lead event
    if (canceledCount > 0) {
      await supabase.from("lead_events").insert({
        lead_id:    id,
        event_type: "automation_stopped",
        message:    `Automation stopped manually — ${canceledCount} scheduled message${canceledCount !== 1 ? "s" : ""} canceled`,
        metadata:   { canceledCount, canceledBy: "rep" },
      });
    }

    return NextResponse.json({ ok: true, canceledCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

/** PATCH — cancel a single pending run */
const PatchSchema = z.object({ runId: z.string().uuid() });

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id }   = await params;
    const { runId } = PatchSchema.parse(await req.json());
    const supabase  = getSupabaseAdmin();

    const { data: run, error } = await supabase
      .from("automation_runs")
      .update({ status: "canceled" })
      .eq("id", runId)
      .eq("lead_id", id)          // safety check — run must belong to this lead
      .eq("status", "pending")
      .select("sequence_step, action_type")
      .single();

    if (error || !run) {
      return NextResponse.json({ ok: false, error: "Run not found or already executed" }, { status: 404 });
    }

    const r = run as { sequence_step: number; action_type: string };

    await supabase.from("lead_events").insert({
      lead_id:    id,
      event_type: "automation_step_skipped",
      message:    `Step ${r.sequence_step} skipped (${r.action_type})`,
      metadata:   { runId, sequenceStep: r.sequence_step, actionType: r.action_type },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
