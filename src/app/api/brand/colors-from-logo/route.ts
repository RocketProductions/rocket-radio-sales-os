/**
 * POST /api/brand/colors-from-logo
 *
 * Sends a logo image URL to GPT-4o vision and asks it to identify
 * the primary, secondary, and accent brand colors as hex values.
 *
 * Optionally persists the result to brand_kits if brandKitId is supplied.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { OpenAIProvider } from "@/ai/providers/openaiProvider";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RequestSchema = z.object({
  logoUrl:    z.string().url(),
  brandKitId: z.string().uuid().optional(), // if provided, updates the DB row
});

const ColorResultSchema = z.object({
  primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  accentColor:    z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  confidence:     z.enum(["high", "medium", "low"]),
  notes:          z.string().nullish(),
});

const SYSTEM_PROMPT = `You are a brand color analyst. Given a logo image, identify the dominant brand colors.
Return ONLY a JSON object — no markdown, no explanation.
Colors must be 6-digit hex values (e.g. #1a2b3c).
If you cannot confidently determine a color, return null for that field.`;

const USER_PROMPT = `Analyze this logo and identify the brand colors.

Rules:
- primaryColor: the most dominant/prominent color in the logo (not white or black unless that IS the brand color)
- secondaryColor: the second most prominent color, if present
- accentColor: a highlight or CTA color if clearly distinct from primary/secondary
- confidence: "high" if colors are clear, "medium" if somewhat ambiguous, "low" if logo is mostly monochrome or unclear
- notes: optional short note if something unusual (e.g. "monochrome logo", "gradient")

Respond ONLY with:
{
  "primaryColor": "#rrggbb" | null,
  "secondaryColor": "#rrggbb" | null,
  "accentColor": "#rrggbb" | null,
  "confidence": "high" | "medium" | "low",
  "notes": string | null
}`;

export async function POST(req: Request) {
  try {
    const body = RequestSchema.parse(await req.json());
    const provider = new OpenAIProvider();

    const raw = await provider.chatWithVision({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt:   USER_PROMPT,
      imageUrl:     body.logoUrl,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Vision API returned invalid JSON");
    }

    const colors = ColorResultSchema.parse(parsed);

    // Persist to brand_kits if a kit ID was supplied
    if (body.brandKitId && (colors.primaryColor || colors.secondaryColor || colors.accentColor)) {
      const supabase = getSupabaseAdmin();
      await supabase
        .from("brand_kits")
        .update({
          primary_color:   colors.primaryColor,
          secondary_color: colors.secondaryColor,
          accent_color:    colors.accentColor,
        })
        .eq("id", body.brandKitId);
    }

    return NextResponse.json({ ok: true, colors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
