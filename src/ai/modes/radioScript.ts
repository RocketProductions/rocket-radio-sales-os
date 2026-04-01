import { z } from "zod";
import { buildFrameworkList, FRAMEWORK_NAMES } from "./radioScriptFrameworks";

export const RadioScriptInputSchema = z.object({
  businessName:  z.string().min(1),
  industry:      z.string().min(1),
  offer:         z.string().min(1),
  targetAudience: z.string().optional(),
  cta:           z.string().optional(),
  tone:          z.string().optional(),
  brandContext:  z.string().optional(), // injected from brand kit scrape
  /**
   * Optional: caller can pin a specific framework by name.
   * If omitted, the AI picks the best fit automatically.
   */
  framework:     z.string().optional(),
});

export type RadioScriptInput = z.infer<typeof RadioScriptInputSchema>;

export const RadioScriptOutputSchema = z.object({
  script:           z.string(),
  wordCount:        z.number(),
  estimatedSeconds: z.number(),
  hook:             z.string(),
  cta:              z.string(),
  framework:        z.string(),          // which framework was used/selected
  frameworkReason:  z.string().nullish(), // why the AI chose it (only present when auto-selected)
  directionNotes:   z.string().nullish(),
});

export type RadioScriptOutput = z.infer<typeof RadioScriptOutputSchema>;

export function buildScriptUserPrompt(input: RadioScriptInput): string {
  const lines = [
    `Business: ${input.businessName} (${input.industry})`,
    `Offer: ${input.offer}`,
    input.targetAudience ? `Audience: ${input.targetAudience}` : null,
    input.cta           ? `CTA: ${input.cta}`                 : null,
    input.tone          ? `Tone: ${input.tone}`               : null,
    input.brandContext  ? `\n${input.brandContext}`            : null,
  ].filter(Boolean).join("\n");

  const frameworkInstruction = input.framework
    ? `Use this specific framework: "${input.framework}"`
    : `Review the 55 frameworks below and select the single best fit for this business, offer, and audience. Return the framework name in the "framework" field and a one-sentence reason in "frameworkReason".`;

  const frameworkBlock = `
RADIO SCRIPT FRAMEWORKS (55 options):
${buildFrameworkList()}

FRAMEWORK INSTRUCTION:
${frameworkInstruction}
`;

  return [
    `Write a 30-second radio spot for 95.3 MNC:`,
    ``,
    lines,
    frameworkBlock,
    `Respond ONLY with a JSON object:`,
    `{`,
    `  "script": string (the full 30-second script, ~75-80 words),`,
    `  "wordCount": number,`,
    `  "estimatedSeconds": number,`,
    `  "hook": string (the opening line),`,
    `  "cta": string (the closing call to action),`,
    `  "framework": string (name of the framework used — must match one of the 55 names exactly),`,
    `  "frameworkReason": string | null (one sentence on why this framework fits — only when you chose it; null if the caller specified it),`,
    `  "directionNotes": string | null (optional read direction for the announcer)`,
    `}`,
  ].join("\n");
}

/** All valid framework names — useful for dropdowns */
export { FRAMEWORK_NAMES };
