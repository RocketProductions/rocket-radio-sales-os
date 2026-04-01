import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PatchSchema = z.object({
  status:     z.enum(["active", "archived"]).optional(),
  lpSlug:     z.string().optional(),
  lpLive:     z.boolean().optional(),
  assetCount: z.number().int().nonnegative().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const headersList   = await headers();
    const tenantId      = headersList.get("x-tenant-id") ?? "";

    const body     = PatchSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Validate tenant ownership
    const { data: existing, error: fetchError } = await supabase
      .from("campaign_sessions")
      .select("id, tenant_id")
      .eq("session_id", sessionId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    const row = existing as { id: string; tenant_id: string | null };

    if (tenantId && row.tenant_id && row.tenant_id !== tenantId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Build update payload
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status     !== undefined) updates.status      = body.status;
    if (body.lpSlug     !== undefined) updates.lp_slug     = body.lpSlug;
    if (body.lpLive     !== undefined) updates.lp_live     = body.lpLive;
    if (body.assetCount !== undefined) updates.asset_count = body.assetCount;

    const { error: updateError } = await supabase
      .from("campaign_sessions")
      .update(updates)
      .eq("session_id", sessionId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
