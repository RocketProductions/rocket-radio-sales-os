import { NextResponse } from "next/server";
import { OpenAIProvider } from "@/ai/providers/openaiProvider";
import {
  SocialShareInputSchema,
  SocialShareOutputSchema,
  SOCIAL_SHARE_SYSTEM_PROMPT,
  buildSocialShareUserPrompt,
} from "@/ai/modes/socialShare";

export const runtime = "nodejs";

const BodySchema = SocialShareInputSchema;

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const provider = new OpenAIProvider();
    const raw = await provider.chat({
      systemPrompt: SOCIAL_SHARE_SYSTEM_PROMPT,
      userPrompt: buildSocialShareUserPrompt(body),
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: `AI returned invalid JSON: ${raw.slice(0, 200)}` },
        { status: 400 }
      );
    }

    const posts = SocialShareOutputSchema.parse(parsed);

    return NextResponse.json({ ok: true, posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
