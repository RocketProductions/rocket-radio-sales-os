import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const VALID_PLATFORMS = ["meta", "linkedin", "tiktok", "pinterest"] as const;

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;

    if (!(VALID_PLATFORMS as readonly string[]).includes(platform)) {
      return NextResponse.json(
        { ok: false, error: `Invalid platform: ${platform}` },
        { status: 400 }
      );
    }

    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "Missing x-tenant-id header" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("social_accounts")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("platform", platform);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
