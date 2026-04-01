import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CreateLeadSchema = z.object({
  landingPageId: z.string().uuid(),
  name:          z.string().optional(),
  phone:         z.string().optional(),
  email:         z.string().email().optional(),
  extraFields:   z.record(z.unknown()).optional(),
});

/** GET /api/leads — list leads, optionally filtered by landingPageId or status */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const landingPageId = searchParams.get("landingPageId");
    const status        = searchParams.get("status");
    const limit         = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("lp_leads")
      .select(`
        id, name, email, phone, status, notes, created_at, updated_at,
        landing_pages ( id, business_name, slug, session_id )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (landingPageId) query = query.eq("landing_page_id", landingPageId);
    if (status)        query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/leads — create a new lead manually */
export async function POST(req: Request) {
  try {
    const body     = CreateLeadSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const { data: lead, error } = await supabase
      .from("lp_leads")
      .insert({
        landing_page_id: body.landingPageId,
        name:            body.name,
        phone:           body.phone,
        email:           body.email,
        extra_fields:    body.extraFields ?? {},
        status:          "new",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data: lead }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
