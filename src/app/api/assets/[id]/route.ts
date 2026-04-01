import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
