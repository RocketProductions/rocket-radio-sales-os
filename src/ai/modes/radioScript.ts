import { z } from "zod";

export const RadioScriptInputSchema = z.object({
  businessName: z.string().min(1),
  industry: z.string().min(1),
  offer: z.string().min(1),
  targetAudience: z.string().optional(),
  cta: z.string().optional(),
  tone: z.string().optional(),
  brandContext: z.string().optional(), // injected from brand kit scrape
});

export type RadioScriptInput = z.infer<typeof RadioScriptInputSchema>;

export const RadioScriptOutputSchema = z.object({
  script: z.string(),
  wordCount: z.number(),
  estimatedSeconds: z.number(),
  hook: z.string(),
  cta: z.string(),
  directionNotes: z.string().nullish(),
});

export type RadioScriptOutput = z.infer<typeof RadioScriptOutputSchema>;

export function buildScriptUserPrompt(input: RadioScriptInput): string {
  const parts = [
    `Business: ${input.businessName} (${input.industry})`,
    `Offer: ${input.offer}`,
    input.targetAudience ? `Audience: ${input.targetAudience}` : null,
    input.cta ? `CTA: ${input.cta}` : null,
    input.tone ? `Tone: ${input.tone}` : null,
    input.brandContext ? `\n${input.brandContext}` : null,
  ].filter(Boolean).join("\n");

  return `Write a 30-second radio spot for 95.3 MNC:\n\n${parts}\n\nRespond ONLY with a JSON object:\n{\n  "script": string (the full 30-second script, ~75-80 words),\n  "wordCount": number,\n  "estimatedSeconds": number,\n  "hook": string (the opening line),\n  "cta": string (the closing call to action),\n  "directionNotes": string | null (optional read direction for the announcer)\n}`;
}
