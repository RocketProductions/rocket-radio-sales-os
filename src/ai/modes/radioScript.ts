import { z } from "zod";
import { buildFrameworkList, FRAMEWORK_NAMES } from "./radioScriptFrameworks";

export const RadioScriptInputSchema = z.object({
  businessName:     z.string().min(1),
  industry:         z.string().min(1),
  offer:            z.string().min(1),
  targetAudience:   z.string().optional(),
  cta:              z.string().optional(),
  tone:             z.string().optional(),
  brandContext:     z.string().optional(), // injected from brand kit scrape
  // Brief context — flows from intake step
  bigIdea:          z.string().optional(),
  campaignType:     z.string().optional(),
  offerScore:       z.number().optional(),
  // Self-improving context
  clientDocContext: z.string().optional(), // extracted from uploaded client documents
  approvedExamples: z.string().optional(), // approved scripts from same industry
  // Framework override
  framework:        z.string().optional(),
  // Routing (stripped before AI call — used by generate route only)
  sessionId:        z.string().optional(),
});

export type RadioScriptInput = z.infer<typeof RadioScriptInputSchema>;

export const RadioScriptOutputSchema = z.object({
  script:           z.string(),
  wordCount:        z.number(),
  estimatedSeconds: z.number(),
  hook:             z.string(),
  cta:              z.string(),
  framework:        z.string(),
  frameworkReason:  z.string().nullish(),
  directionNotes:   z.string().nullish(),
});

export type RadioScriptOutput = z.infer<typeof RadioScriptOutputSchema>;

export function buildScriptUserPrompt(input: RadioScriptInput): string {
  const lines = [
    `Business: ${input.businessName} (${input.industry})`,
    `Offer: ${input.offer}`,
    input.targetAudience ? `Audience: ${input.targetAudience}` : null,
    input.cta           ? `CTA: ${input.cta}`                  : null,
    input.tone          ? `Tone: ${input.tone}`                : null,
    input.bigIdea       ? `Campaign Big Idea: "${input.bigIdea}"` : null,
    input.campaignType  ? `Campaign Type: ${input.campaignType.replace(/_/g, " ")}` : null,
    input.offerScore    ? `Offer Score: ${input.offerScore}/10` : null,
    input.brandContext  ? `\n${input.brandContext}`             : null,
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

  const clientDocBlock = input.clientDocContext
    ? `\n${input.clientDocContext}\n`
    : "";

  const examplesBlock = input.approvedExamples
    ? `\n${input.approvedExamples}\n`
    : "";

  return [
    `Write a 30-second radio spot for 95.3 MNC:`,
    ``,
    lines,
    clientDocBlock,
    examplesBlock,
    frameworkBlock,
    `Respond ONLY with a JSON object:`,
    `{`,
    `  "script": string (the full 30-second script, ~75-80 words),`,
    `  "wordCount": number,`,
    `  "estimatedSeconds": number,`,
    `  "hook": string (the opening line),`,
    `  "cta": string (the closing call to action),`,
    `  "framework": string (name of the framework used — must match one of the 55 names exactly),`,
    `  "frameworkReason": string | null (one sentence on why this framework fits — null if caller specified it),`,
    `  "directionNotes": string | null (optional read direction for the announcer)`,
    `}`,
  ].join("\n");
}

/** All valid framework names — useful for dropdowns */
export { FRAMEWORK_NAMES };
