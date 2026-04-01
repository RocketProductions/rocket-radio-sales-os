import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const UpdateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "booked", "closed", "lost"]).optional(),
  notes:  z.string().optional(),
});

/** Statuses that should automatically cancel pending automation */
const AUTO_CANCEL_STATUSES = new Set(["booked", "closed", "lost"]);

/** GET /api/leads/[id] */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Try lp_leads first (landing page form submissions)
    const { data: lead, error } = await supabase
      .from("lp_leads")
      .select(`
        id, name, email, phone, status, notes, extra_fields, created_at, updated_at,
        landing_pages ( id, business_name, slug, session_id )
      `)
      .eq("id", id)
      .single();

    if (!error && lead) {
      return NextResponse.json({ ok: true, data: lead });
    }

    // Fallback: try the automation leads table
    const { data: aLead, error: aError } = await supabase
      .from("leads")
      .select("id, first_name, last_name, email, phone, status, notes, source, created_at, updated_at")
      .eq("id", id)
      .single();

    if (aError || !aLead) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: aLead });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** PATCH /api/leads/[id] — update status or notes; auto-cancels automation at key stages */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }   = await params;
    const body     = UpdateLeadSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes  !== undefined) updates.notes  = body.notes;

    // Try lp_leads first
    const { data: lead, error } = await supabase
      .from("lp_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    // If not in lp_leads, try leads table
    if (error) {
      const { data: aLead, error: aError } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (aError) throw new Error(aError.message);

      // Auto-cancel pending automation on terminal statuses
      if (body.status && AUTO_CANCEL_STATUSES.has(body.status)) {
        await cancelPendingAutomation(id, body.status, supabase);
      }

      return NextResponse.json({ ok: true, data: aLead });
    }

    // Auto-cancel pending automation on terminal statuses (lp_leads path)
    if (body.status && AUTO_CANCEL_STATUSES.has(body.status)) {
      await cancelPendingAutomation(id, body.status, supabase);
    }

    return NextResponse.json({ ok: true, data: lead });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

/** Cancel all pending automation runs and log the event */
async function cancelPendingAutomation(
  leadId: string,
  triggerStatus: string,
  supabase: ReturnType<typeof getSupabaseAdmin>
) {
  const { data: canceled } = await supabase
    .from("automation_runs")
    .update({ status: "canceled" })
    .eq("lead_id", leadId)
    .eq("status", "pending")
    .select("id");

  const count = (canceled ?? []).length;
  if (count === 0) return;

  const reasonMap: Record<string, string> = {
    booked:  "Lead booked — no more follow-up needed",
    closed:  "Lead closed — automation ended",
    lost:    "Lead marked lost — automation ended",
  };

  await supabase.from("lead_events").insert({
    lead_id:    leadId,
    event_type: "automation_stopped",
    message:    `${reasonMap[triggerStatus] ?? "Automation stopped"} (${count} step${count !== 1 ? "s" : ""} canceled)`,
    metadata:   { canceledCount: count, triggerStatus, canceledBy: "system" },
  });
}
