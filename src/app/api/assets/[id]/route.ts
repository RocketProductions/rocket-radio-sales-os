import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PatchSchema = z.object({
  owner_type: z.enum(["client", "agency"]).optional(),
  tags:       z.array(z.string()).optional(),
});

/** PATCH /api/assets/[id] — update owner_type (promote/demote) or tags */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = PatchSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = {};
    if (body.owner_type !== undefined) updates.owner_type = body.owner_type;
    if (body.tags       !== undefined) updates.tags       = body.tags;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("brand_uploads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, asset: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing asset id" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch the asset first so we know the storage path
    const { data: asset, error: fetchError } = await supabase
      .from("brand_uploads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ ok: false, error: "Asset not found" }, { status: 404 });
    }

    // Delete from storage if it's not a note
    if (asset.category !== "note" && asset.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("brand-uploads")
        .remove([asset.storage_path]);

      if (storageError) {
        // Log but don't fail — still remove the DB row
        console.error(`Storage delete error for ${id}: ${storageError.message}`);
      }
    }

    // Delete the database row
    const { error: dbError } = await supabase
      .from("brand_uploads")
      .delete()
      .eq("id", id);

    if (dbError) {
      throw new Error(`Failed to delete asset record: ${dbError.message}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
