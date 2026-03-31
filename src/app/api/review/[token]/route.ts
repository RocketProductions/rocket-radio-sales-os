import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Params = { params: Promise<{ token: string }> };

// GET /api/review/[token] — fetch review session + assets
export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const supabase = getSupabaseAdmin();

    const { data: session, error: sessionError } = await supabase
      .from("review_sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ ok: false, error: "Review link not found or expired" }, { status: 404 });
    }

    // Mark as viewed (first time only)
    if (!(session as Record<string, unknown>).viewed_at) {
      await supabase
        .from("review_sessions")
        .update({ viewed_at: new Date().toISOString(), status: "viewed" })
        .eq("token", token);
    }

    // Fetch the assets
    const assetIds = (session as { asset_ids: string[] }).asset_ids ?? [];
    let assets: unknown[] = [];
    if (assetIds.length > 0) {
      const { data } = await supabase
        .from("campaign_assets")
        .select("id, asset_type, content, edited_content, status")
        .in("id", assetIds);
      assets = data ?? [];
    }

    return NextResponse.json({ ok: true, session, assets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

const RespondSchema = z.object({
  action: z.enum(["approve", "request_changes"]),
  notes: z.string().optional(),
});

// POST /api/review/[token] — client responds
export async function POST(req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const body = RespondSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const { data: session, error } = await supabase
      .from("review_sessions")
      .select("id, asset_ids, status")
      .eq("token", token)
      .single();

    if (error || !session) {
      return NextResponse.json({ ok: false, error: "Review link not found" }, { status: 404 });
    }

    const s = session as { id: string; asset_ids: string[]; status: string };

    // Update review session status
    await supabase
      .from("review_sessions")
      .update({
        status: body.action === "approve" ? "approved" : "changes_requested",
        client_notes: body.notes ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", s.id);

    // If approved, flip all asset statuses to 'approved'
    if (body.action === "approve" && s.asset_ids.length > 0) {
      await supabase
        .from("campaign_assets")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .in("id", s.asset_ids);
    }

    return NextResponse.json({ ok: true, action: body.action });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
