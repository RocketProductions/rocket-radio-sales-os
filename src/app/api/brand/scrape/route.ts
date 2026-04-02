import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeWebsite } from "@/lib/scraper";
import { scrapeForIntake } from "@/lib/intakeScraper";
import { buildBrandAnalysisPrompt, BrandKitSchema, type BrandKit } from "@/ai/modes/brandAnalysis";
import { buildIntakeSuggestionsPrompt, INTAKE_SUGGESTIONS_SYSTEM_PROMPT, IntakeSuggestionsOutputSchema, type IntakeSuggestions } from "@/ai/modes/intakeSuggestions";
import { OpenAIProvider } from "@/ai/providers/openaiProvider";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RequestSchema = z.object({
  url: z.string().min(3),
});

const ColorResultSchema = z.object({
  primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  accentColor:    z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  confidence:     z.enum(["high", "medium", "low"]),
});

// Known WordPress/Gutenberg default editor palette colors.
// If all three brand colors match these, they're editor defaults — not brand colors.
const WP_GUTENBERG_COLORS = new Set([
  "#7a00df", "#007cba", "#00d084", "#fcb900", "#ff6900",
  "#9b51e0", "#eb144c", "#abb8c3", "#0693e3", "#8ed1fc",
]);

function looksLikeWordPressDefaults(primary?: string | null, secondary?: string | null, accent?: string | null): boolean {
  const colors = [primary, secondary, accent].filter(Boolean) as string[];
  if (colors.length === 0) return false;
  const wpMatches = colors.filter((c) => WP_GUTENBERG_COLORS.has(c.toLowerCase()));
  // If 2+ of the detected colors are WP defaults, treat the whole set as suspect
  return wpMatches.length >= 2;
}

const VISION_SYSTEM = `You are a brand color analyst. Given a logo image, identify the dominant brand colors.
Return ONLY a JSON object — no markdown, no explanation.
Colors must be 6-digit hex values (e.g. #1a2b3c).
If you cannot confidently determine a color, return null for that field.`;

const VISION_PROMPT = `Analyze this logo and identify the brand colors.
- primaryColor: the most dominant/prominent color (not white or black unless that IS the brand color)
- secondaryColor: the second most prominent color, if present
- accentColor: a highlight or CTA color if clearly distinct
- confidence: "high" if clear, "medium" if ambiguous, "low" if monochrome/unclear

Respond ONLY with:
{"primaryColor":"#rrggbb"|null,"secondaryColor":"#rrggbb"|null,"accentColor":"#rrggbb"|null,"confidence":"high"|"medium"|"low"}`;

export async function POST(req: Request) {
  try {
    const { url } = RequestSchema.parse(await req.json());

    // 1. Scrape website + intake in parallel
    const [rawData, intakeScrapeData] = await Promise.all([
      scrapeWebsite(url),
      scrapeForIntake(url).catch(() => null),
    ]);

    // 2. Brand analysis (text)
    const provider = new OpenAIProvider();
    const systemPrompt = `You are a brand intelligence analyst. Extract brand identity signals from website data.
Focus on: tone of voice, visual identity, value propositions, target audience, and key messaging.
Always respond with valid JSON matching the exact schema. No markdown fences.`;

    const rawJson = await provider.chat({
      systemPrompt,
      userPrompt: buildBrandAnalysisPrompt(rawData),
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error("Brand analysis returned invalid JSON");
    }

    const kit: BrandKit = BrandKitSchema.parse(parsed);

    // 3. Decide whether to run vision color detection
    //    - No colors found (site uses external CSS we can't reach, e.g. Webflow)
    //    - Colors look like WordPress/Gutenberg defaults
    const needsVisionColors =
      kit.logoUrl &&
      (!kit.primaryColor || looksLikeWordPressDefaults(kit.primaryColor, kit.secondaryColor, kit.accentColor));

    // 4. Run intake suggestions + optional vision color detection in parallel
    const [intake, visionColors] = await Promise.all([
      // 4a. Intake suggestions
      intakeScrapeData
        ? (async (): Promise<IntakeSuggestions | null> => {
            try {
              const intakeRaw = await provider.chat({
                systemPrompt: INTAKE_SUGGESTIONS_SYSTEM_PROMPT,
                userPrompt: buildIntakeSuggestionsPrompt(intakeScrapeData.allText),
              });
              const intakeParsed = JSON.parse(intakeRaw);
              return IntakeSuggestionsOutputSchema.parse(intakeParsed);
            } catch { return null; }
          })()
        : Promise.resolve(null as IntakeSuggestions | null),

      // 4b. Vision color detection (non-fatal)
      needsVisionColors && kit.logoUrl
        ? (async () => {
            try {
              const raw = await provider.chatWithVision({
                systemPrompt: VISION_SYSTEM,
                userPrompt:   VISION_PROMPT,
                imageUrl:     kit.logoUrl!,
              });
              const colorParsed = JSON.parse(raw);
              return ColorResultSchema.parse(colorParsed);
            } catch { return null; }
          })()
        : Promise.resolve(null),
    ]);

    // 5. Resolve final colors — vision wins over CSS-scraped defaults
    const finalPrimary   = visionColors?.primaryColor   ?? kit.primaryColor   ?? null;
    const finalSecondary = visionColors?.secondaryColor ?? kit.secondaryColor ?? null;
    const finalAccent    = visionColors?.accentColor    ?? kit.accentColor    ?? null;
    const colorSource    = visionColors ? "logo" : (kit.primaryColor ? "css" : "none");

    // 6. Persist to brand_kits
    const supabase = getSupabaseAdmin();
    const { data: savedKit, error } = await supabase
      .from("brand_kits")
      .insert({
        website_url:          url,
        business_name:        null,
        business_description: kit.businessDescription,
        tagline:              kit.tagline ?? null,
        logo_url:             kit.logoUrl ?? null,
        favicon_url:          rawData.favicon ?? null,
        primary_color:        finalPrimary,
        secondary_color:      finalSecondary,
        accent_color:         finalAccent,
        font_headline:        kit.fontSuggestions?.headline ?? null,
        font_body:            kit.fontSuggestions?.body ?? null,
        tone_words:           kit.toneWords,
        key_phrases:          kit.keyPhrases,
        target_audience:      kit.targetAudience,
        unique_value_prop:    kit.uniqueValueProp,
        industry:             kit.industry,
        raw_meta: {
          title:           rawData.title,
          metaDescription: rawData.metaDescription,
          ogTitle:         rawData.ogTitle,
          headings:        rawData.headings,
          cssColors:       rawData.cssColors,
          colorSource,
        },
      })
      .select()
      .single();

    if (error) {
      console.error("brand_kits insert error:", error.message);
    }

    // Return kit with resolved colors so the UI shows correct values immediately
    const resolvedKit: BrandKit = {
      ...kit,
      primaryColor:   finalPrimary ?? undefined,
      secondaryColor: finalSecondary ?? undefined,
      accentColor:    finalAccent ?? undefined,
    };

    return NextResponse.json({
      ok:           true,
      kit:          resolvedKit,
      id:           (savedKit as { id?: string } | null)?.id ?? null,
      scrapedTitle: rawData.title,
      scrapedPhone: rawData.phone,
      intake,
      colorSource,  // 'logo' | 'css' | 'none' — useful for UI to show how colors were detected
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
