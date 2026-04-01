import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCampaignContent } from "@/ai/generateContent";
import { isCampaignMode } from "@/ai/modes";
import { enrichGenerationInput } from "@/lib/contextBuilder";

const GenerateSchema = z.object({
  mode:  z.string().min(1),
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

    // ── Self-improving context enrichment ──────────────────────────────────
    // Extract routing params (not passed to AI schema directly)
    const sessionId  = typeof input.sessionId  === "string" ? input.sessionId  : undefined;
    const industry   = typeof input.industry   === "string" ? input.industry   : undefined;

    // Map mode to assetType for example retrieval
    const assetTypeMap: Record<string, "radio-script" | "funnel-copy" | "follow-up-sequence"> = {
      "radio-script":       "radio-script",
      "funnel-copy":        "funnel-copy",
      "follow-up-sequence": "follow-up-sequence",
    };
    const assetType = assetTypeMap[mode];

    // Fetch client docs + approved examples in parallel (non-blocking)
    const { clientDocContext, approvedExamples } = assetType
      ? await enrichGenerationInput({ sessionId, industry, assetType })
      : { clientDocContext: null, approvedExamples: null };

    // Inject context into input (AI mode schemas accept these as optional strings)
    const enrichedInput: Record<string, unknown> = { ...input };
    if (clientDocContext)  enrichedInput.clientDocContext  = clientDocContext;
    if (approvedExamples)  enrichedInput.approvedExamples  = approvedExamples;

    const output = await generateCampaignContent(mode, enrichedInput);
    return NextResponse.json({ ok: true, data: { mode, output } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
