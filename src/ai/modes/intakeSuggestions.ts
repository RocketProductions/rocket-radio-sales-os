/**
 * AI mode: intake field suggestions from multi-page website content.
 *
 * Targets exactly three intake form fields:
 *   industry       — what this business does
 *   targetAudience — who they serve (geography + demographics)
 *   seasonality    — busy/slow periods, or "year-round"
 *
 * Does NOT attempt "Current Offer" — that is always a campaign-specific
 * promotional offer, not something that lives on the website.
 */

import { z } from "zod";

export const IntakeSuggestionsOutputSchema = z.object({
  industry: z.string().min(1),
  targetAudience: z.string().min(1),
  seasonality: z.string().min(1),
  confidence: z.object({
    industry: z.enum(["high", "medium", "low"]),
    targetAudience: z.enum(["high", "medium", "low"]),
    seasonality: z.enum(["high", "medium", "low"]),
  }),
});

export type IntakeSuggestions = z.infer<typeof IntakeSuggestionsOutputSchema>;

export const INTAKE_SUGGESTIONS_SYSTEM_PROMPT = `You are a local business analyst helping a radio sales rep fill out a campaign intake form.

You will be given scraped text from a business's website (homepage + subpages).

Your job: extract exactly 3 fields for the intake form. Be specific and concise.

Rules:
- industry: 2-5 words describing what they do (e.g. "Kitchen & Bath Remodeling", "Music Lessons", "Family Dentistry"). Never generic like "Service Business".
- targetAudience: describe WHO they serve — include geography if clear, demographics if stated or implied, age ranges if relevant. 1-2 sentences max. Example: "Homeowners in the South Bend / Elkhart Indiana area looking to upgrade kitchens, bathrooms, and living spaces." or "Families with children ages 4-17 in the Michiana region seeking music lessons for piano, guitar, voice, and more."
- seasonality: describe demand patterns. If no clear seasonality, say "Year-round steady demand". If seasonal, be specific: "Peak demand spring through fall for outdoor projects" or "Back-to-school surge in August-September, steady monthly enrollment otherwise".
- confidence: rate how confident you are in each field based on available evidence.

Respond ONLY with valid JSON. No markdown, no explanation.`;

export function buildIntakeSuggestionsPrompt(allText: string, businessName?: string): string {
  const nameHint = businessName ? `Business name: ${businessName}\n\n` : "";
  return `${nameHint}Website content:\n\n${allText}\n\nFill the 3 intake form fields based on this content. Respond with JSON only:\n{\n  "industry": string,\n  "targetAudience": string,\n  "seasonality": string,\n  "confidence": { "industry": "high"|"medium"|"low", "targetAudience": "high"|"medium"|"low", "seasonality": "high"|"medium"|"low" }\n}`;
}
