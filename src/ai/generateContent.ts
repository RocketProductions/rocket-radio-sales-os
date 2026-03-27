import { GenerateContentInputSchema, GenerateContentResultSchema } from "./schemas/content";
import { OpenAIProvider } from "./providers/openaiProvider";
import type { GenerateContentInput, GenerateContentResult } from "@/types/content";

export async function generateContent(input: GenerateContentInput): Promise<GenerateContentResult> {
  const parsedInput = GenerateContentInputSchema.parse(input);
  const provider = new OpenAIProvider();
  const result = await provider.generateContent(parsedInput);
  return GenerateContentResultSchema.parse(result);
}
