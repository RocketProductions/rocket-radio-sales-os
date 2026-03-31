import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PatchSchema = z.object({
  editedContent: z.record(z.unknown()).optional(),
  status: z.enum(["draft", "edited", "approved", "published"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = PatchSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.editedContent !== undefined) updates.edited_content = body.editedContent;
    if (body.status !== undefined) updates.status = body.status;

    const { error } = await supabase
      .from("campaign_assets")
      .update(updates)
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, asset: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
