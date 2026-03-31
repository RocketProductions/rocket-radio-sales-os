import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const Schema = z.object({
  sessionId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).min(1),
  businessName: z.string().optional(),
  repMessage: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const token = randomBytes(20).toString("hex"); // 40-char URL-safe token

    const { data, error } = await supabase
      .from("review_sessions")
      .insert({
        token,
        session_id: body.sessionId,
        asset_ids: body.assetIds,
        business_name: body.businessName ?? null,
        rep_message: body.repMessage ?? null,
        status: "pending",
      })
      .select("id, token")
      .single();

    if (error) throw new Error(error.message);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocket-radio-sales-os.vercel.app";
    const reviewUrl = `${baseUrl}/review/${token}`;

    return NextResponse.json({ ok: true, token, reviewUrl, id: (data as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
