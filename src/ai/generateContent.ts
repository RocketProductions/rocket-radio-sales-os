import { GenerateContentInput, GenerateContentResult } from "@/types/content";
import { GenerateContentInputSchema, GenerateContentResultSchema } from "@/ai/schemas/content";
import { OpenAIProvider } from "@/ai/providers/openaiProvider";
import { CAMPAIGN_MODES, isCampaignMode } from "@/ai/modes";
import type { CampaignModeType } from "@/ai/prompts/systemPrompts";

/** Legacy entry point — used by /api/generate and backward-compatible callers */
export async function generateContent(input: unknown): Promise<GenerateContentResult> {
  const parsedInput = GenerateContentInputSchema.parse(input) as GenerateContentInput;
  const provider = new OpenAIProvider();
  const result = await provider.generateContent(parsedInput);
  return GenerateContentResultSchema.parse(result) as GenerateContentResult;
}

/**
 * Campaign mode entry point — typed, schema-validated AI generation.
 *
 * Usage:
 *   const output = await generateCampaignContent("client-intake", { businessName: "...", ... });
 */
export async function generateCampaignContent<T = unknown>(
  mode: string,
  input: unknown,
): Promise<T> {
  if (!isCampaignMode(mode)) {
    throw new Error(`Unknown campaign mode: ${mode}`);
  }

  const modeConfig = CAMPAIGN_MODES[mode as CampaignModeType];

  // Validate input against the mode's schema
  const validatedInput = modeConfig.inputSchema.parse(input);

  // Build prompts
  const systemPrompt = modeConfig.systemPrompt;
  const userPrompt = modeConfig.buildUserPrompt(validatedInput);

  // Call OpenAI
  const provider = new OpenAIProvider();
  const rawJson = await provider.chat({ systemPrompt, userPrompt });

  // Parse and validate output
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error(`AI returned invalid JSON for mode ${mode}: ${rawJson.slice(0, 200)}`);
  }

  return modeConfig.outputSchema.parse(parsed) as T;
}
