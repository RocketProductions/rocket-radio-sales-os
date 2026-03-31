import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCampaignContent } from "@/ai/generateContent";
import { isCampaignMode } from "@/ai/modes";

const GenerateSchema = z.object({
  mode: z.string().min(1),
  input: z.record(z.unknown()),
});

export async function POST(req: Request) {
  try {
    const { mode, input } = GenerateSchema.parse(await req.json());

    if (!isCampaignMode(mode)) {
      return NextResponse.json(
        { ok: false, error: `Unknown campaign mode: ${mode}` },
        { status: 400 }
      );
    }

    const output = await generateCampaignContent(mode, input);
    return NextResponse.json({ ok: true, data: { mode, output } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
