import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const UpdateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "booked", "closed", "lost"]).optional(),
  notes:  z.string().optional(),
});

/** GET /api/leads/[id] — get a single lead with landing page context */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: lead, error } = await supabase
      .from("lp_leads")
      .select(`
        id, name, email, phone, status, notes, extra_fields, created_at, updated_at,
        landing_pages ( id, business_name, slug, session_id )
      `)
      .eq("id", id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: lead });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** PATCH /api/leads/[id] — update lead status (one-tap: contacted, booked, closed) */
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

    const { data: lead, error } = await supabase
      .from("lp_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data: lead });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
