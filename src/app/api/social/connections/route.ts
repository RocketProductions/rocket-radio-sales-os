import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { SocialAccountSafe } from "@/types/social";

export const runtime = "nodejs";

function toSafeAccount(row: {
  id: string;
  platform: string;
  account_name: string | null;
  page_name: string | null;
  page_id: string | null;
  scopes: string[] | null;
  connected_at: string;
  expires_at: string | null;
}): SocialAccountSafe {
  const isExpired =
    row.expires_at != null && new Date(row.expires_at) < new Date();

  return {
    id: row.id,
    platform: row.platform as SocialAccountSafe["platform"],
    account_name: row.account_name,
    page_name: row.page_name,
    page_id: row.page_id,
    scopes: row.scopes ?? [],
    connected_at: row.connected_at,
    expires_at: row.expires_at,
    isExpired,
  };
}

export async function GET(req: Request) {
  try {
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "Missing x-tenant-id header" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("social_accounts")
      .select(
        "id, platform, account_name, page_name, page_id, scopes, connected_at, expires_at"
      )
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const connections: SocialAccountSafe[] = (data ?? []).map(toSafeAccount);

    return NextResponse.json({ ok: true, connections });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

const DeleteBodySchema = z.object({
  platform: z.enum(["meta", "linkedin", "tiktok", "pinterest"]),
});

export async function DELETE(req: Request) {
  try {
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "Missing x-tenant-id header" },
        { status: 400 }
      );
    }

    const body = DeleteBodySchema.parse(await req.json());

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("social_accounts")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("platform", body.platform);

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
