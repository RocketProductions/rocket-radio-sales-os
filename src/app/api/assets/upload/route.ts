import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { extractText } from "@/lib/documentExtractor";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const VALID_CATEGORIES = ["logo", "photo", "document"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const tenantId = req.headers.get("x-tenant-id") ?? "default";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const sessionId  = (formData.get("sessionId")  as string | null) ?? null;
    const brandKitId = (formData.get("brandKitId") as string | null) ?? null;
    const ownerType  = (formData.get("ownerType")  as "client" | "agency" | null) ?? "client";

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      return NextResponse.json(
        { ok: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const assetId = randomUUID();
    const storagePath = `${category}/${assetId}/${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── Text extraction (documents only — non-fatal) ──────────────────────
    let extractedText: string | null = null;
    let extractionStatus: "extracted" | "unsupported" | "failed" | "pending" = "pending";

    if (category === "document") {
      const result = await extractText(buffer, file.type, file.name);
      extractedText   = result.text;
      extractionStatus = result.status;
    } else {
      extractionStatus = "unsupported"; // logos and photos don't yield text
    }

    const supabase = getSupabaseAdmin();

    const { error: storageError } = await supabase.storage
      .from("brand-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    const { data: asset, error: dbError } = await supabase
      .from("brand_uploads")
      .insert({
        id: assetId,
        session_id: sessionId,
        brand_kit_id: brandKitId,
        tenant_id: tenantId,
        file_name: file.name,
        original_name: file.name,
        file_type: file.type,
        category,
        storage_path: storagePath,
        file_size: file.size,
        note_content: null,
        owner_type: ownerType,
        tags: [],
        extracted_text: extractedText,
        extraction_status: extractionStatus,
      })
      .select()
      .single();

    if (dbError) {
      // Attempt to clean up orphaned storage object
      await supabase.storage.from("brand-uploads").remove([storagePath]);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return NextResponse.json({
      ok: true,
      asset: {
        id: asset.id,
        file_name: asset.file_name,
        original_name: asset.original_name,
        file_type: asset.file_type,
        category: asset.category,
        file_size: asset.file_size,
        storage_path: asset.storage_path,
        created_at: asset.created_at,
        extracted_text: extractedText ? true : false, // boolean hint for UI
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
