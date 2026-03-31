import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CreateSchema = z.object({
  sessionId: z.string().uuid(),
  assetType: z.enum(["brief", "radio-script", "funnel-copy", "follow-up-sequence"]),
  content: z.record(z.unknown()),
  businessName: z.string().optional(),
  brandKitId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const body = CreateSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("campaign_assets")
      .insert({
        session_id: body.sessionId,
        asset_type: body.assetType,
        content: body.content,
        business_name: body.businessName ?? null,
        brand_kit_id: body.brandKitId ?? null,
        campaign_id: body.campaignId ?? null,
        status: "draft",
        version: 1,
      })
      .select("id, status")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, id: (data as { id: string }).id, status: "draft" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
