import { z } from "zod";
import type { RawScrapeData } from "@/lib/scraper";

export const BrandKitSchema = z.object({
  businessDescription: z.string(),
  tagline: z.string().nullish(),
  logoUrl: z.string().nullish(),
  primaryColor: z.string().nullish(),     // hex preferred
  secondaryColor: z.string().nullish(),
  accentColor: z.string().nullish(),
  toneWords: z.array(z.string()),          // e.g. ["friendly", "professional", "local"]
  keyPhrases: z.array(z.string()),         // phrases the business actually uses
  targetAudience: z.string(),
  uniqueValueProp: z.string(),             // what makes them different in one sentence
  industry: z.string(),
  fontSuggestions: z.object({
    headline: z.string().nullish(),
    body: z.string().nullish(),
  }).nullish(),
});

export type BrandKit = z.infer<typeof BrandKitSchema>;

/** Build a formatted brand context string for injecting into AI prompts */
export function formatBrandContext(kit: BrandKit): string {
  const lines = [
    `--- BRAND CONTEXT (auto-detected from website) ---`,
    `Voice & Tone: ${kit.toneWords.join(", ")}`,
    `What Makes Them Different: ${kit.uniqueValueProp}`,
    `Target Audience: ${kit.targetAudience}`,
  ];
  if (kit.keyPhrases.length > 0) {
    lines.push(`Key Phrases They Use: ${kit.keyPhrases.slice(0, 5).map(p => `"${p}"`).join(", ")}`);
  }
  if (kit.tagline) {
    lines.push(`Tagline: "${kit.tagline}"`);
  }
  if (kit.primaryColor || kit.accentColor) {
    const colors = [
      kit.primaryColor ? `Primary ${kit.primaryColor}` : null,
      kit.accentColor ? `Accent ${kit.accentColor}` : null,
    ].filter(Boolean).join(" | ");
    lines.push(`Brand Colors: ${colors}`);
  }
  lines.push(`--- END BRAND CONTEXT ---`);
  return lines.join("\n");
}

/** Build the user prompt for brand analysis */
export function buildBrandAnalysisPrompt(data: RawScrapeData): string {
  const parts = [
    `Website: ${data.url}`,
    `Page Title: ${data.title}`,
    data.metaDescription ? `Meta Description: ${data.metaDescription}` : null,
    data.ogTitle ? `OG Title: ${data.ogTitle}` : null,
    data.ogDescription ? `OG Description: ${data.ogDescription}` : null,
    data.ogImage ? `OG Image URL: ${data.ogImage}` : null,
    data.favicon ? `Favicon URL: ${data.favicon}` : null,
    data.headings.length > 0 ? `Page Headings:\n${data.headings.slice(0, 8).map(h => `  - ${h}`).join("\n")}` : null,
    data.bodyCopyExcerpt ? `Body Copy Excerpt:\n${data.bodyCopyExcerpt.slice(0, 1500)}` : null,
    data.cssColors.length > 0 ? `CSS Colors Found: ${data.cssColors.slice(0, 10).join(", ")}` : null,
    Object.keys(data.cssVariables).length > 0
      ? `CSS Variables: ${Object.entries(data.cssVariables).slice(0, 10).map(([k, v]) => `${k}: ${v}`).join(", ")}`
      : null,
  ].filter(Boolean).join("\n\n");

  return `Analyze this local business website and extract brand intelligence:\n\n${parts}\n\nRespond ONLY with a JSON object:\n{\n  "businessDescription": string (1-2 sentences describing what this business does),\n  "tagline": string | null (their actual tagline if found),\n  "logoUrl": string | null (best logo/brand image URL found — use ogImage if it looks like a logo),\n  "primaryColor": string | null (dominant brand color as hex),\n  "secondaryColor": string | null,\n  "accentColor": string | null (CTA/button color if found),\n  "toneWords": string[] (3-5 words describing their voice: e.g. "friendly", "expert", "local", "trustworthy"),\n  "keyPhrases": string[] (3-6 actual phrases or claims from their site),\n  "targetAudience": string (who they serve),\n  "uniqueValueProp": string (what makes them different in one sentence),\n  "industry": string (specific industry/trade),\n  "fontSuggestions": { "headline": string | null, "body": string | null } | null\n}`;
}
