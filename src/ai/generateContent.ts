import {
  GenerateContentInputSchema,
  GenerateContentResultSchema,
} from "./schemas/content";
import { OpenAIProvider } from "./providers/openaiProvider";
import type {
  GenerateContentInput,
  GenerateContentResult,
} from "@/types/content";

/**
 * The single entry point for all AI content generation in the application.
 * It validates the input, delegates to the provider, and validates the output.
 */
export async function generateContent(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  // Validate input
  const parsedInput = GenerateContentInputSchema.parse(input);

  // Instantiate provider (swap with other providers as needed)
  const provider = new OpenAIProvider();

  // Call provider
  const result = await provider.generateContent(parsedInput);

  // Validate result
  return GenerateContentResultSchema.parse(result);
}