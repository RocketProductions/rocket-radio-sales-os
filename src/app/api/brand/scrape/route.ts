import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeWebsite } from "@/lib/scraper";
import { buildBrandAnalysisPrompt, BrandKitSchema, type BrandKit } from "@/ai/modes/brandAnalysis";
import { OpenAIProvider } from "@/ai/providers/openaiProvider";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RequestSchema = z.object({
  url: z.string().min(3),
});

export async function POST(req: Request) {
  try {
    const { url } = RequestSchema.parse(await req.json());

    // 1. Scrape the website
    const rawData = await scrapeWebsite(url);

    // 2. Analyze with OpenAI
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

    // 3. Persist to brand_kits table
    const supabase = getSupabaseAdmin();
    const { data: savedKit, error } = await supabase
      .from("brand_kits")
      .insert({
        website_url: url,
        business_name: null, // caller fills this in from the intake form
        business_description: kit.businessDescription,
        tagline: kit.tagline ?? null,
        logo_url: kit.logoUrl ?? null,
        favicon_url: rawData.favicon ?? null,
        primary_color: kit.primaryColor ?? null,
        secondary_color: kit.secondaryColor ?? null,
        accent_color: kit.accentColor ?? null,
        font_headline: kit.fontSuggestions?.headline ?? null,
        font_body: kit.fontSuggestions?.body ?? null,
        tone_words: kit.toneWords,
        key_phrases: kit.keyPhrases,
        target_audience: kit.targetAudience,
        unique_value_prop: kit.uniqueValueProp,
        industry: kit.industry,
        raw_meta: {
          title: rawData.title,
          metaDescription: rawData.metaDescription,
          ogTitle: rawData.ogTitle,
          headings: rawData.headings,
          cssColors: rawData.cssColors,
        },
      })
      .select()
      .single();

    if (error) {
      // Non-fatal — return kit even if DB save fails
      console.error("brand_kits insert error:", error.message);
    }

    return NextResponse.json({
      ok: true,
      kit,
      id: (savedKit as { id?: string } | null)?.id ?? null,
      scrapedTitle: rawData.title,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
