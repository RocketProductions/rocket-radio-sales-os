import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const tenantId = req.headers.get("x-tenant-id") ?? "default";
    const body = await req.json();

    const { title, noteContent, brandKitId, sessionId } = body as {
      title: string;
      noteContent: string;
      brandKitId?: string;
      sessionId?: string;
    };

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    }
    if (!noteContent || typeof noteContent !== "string") {
      return NextResponse.json({ ok: false, error: "noteContent is required" }, { status: 400 });
    }

    const assetId = randomUUID();
    const supabase = getSupabaseAdmin();

    const { data: asset, error } = await supabase
      .from("brand_uploads")
      .insert({
        id: assetId,
        session_id: sessionId ?? null,
        brand_kit_id: brandKitId ?? null,
        tenant_id: tenantId,
        file_name: title.trim(),
        original_name: title.trim(),
        file_type: "text/plain",
        category: "note",
        storage_path: null,
        file_size: new TextEncoder().encode(noteContent).length,
        note_content: noteContent,
        tags: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save note: ${error.message}`);
    }

    return NextResponse.json({ ok: true, asset });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId =
      url.searchParams.get("tenantId") ?? req.headers.get("x-tenant-id") ?? "default";
    const sessionId = url.searchParams.get("sessionId");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("brand_uploads")
      .select("*")
      .eq("category", "note")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, assets: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
