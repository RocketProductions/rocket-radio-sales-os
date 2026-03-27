import { GenerateContentInput, GenerateContentResult } from "@/types/content";
import { GenerateContentInputSchema, GenerateContentResultSchema } from "@/ai/schemas/content";
import { OpenAIProvider } from "@/ai/providers/openaiProvider";

export async function generateContent(input: unknown): Promise<GenerateContentResult> {
  const parsedInput = GenerateContentInputSchema.parse(input) as GenerateContentInput;
  const provider = new OpenAIProvider();
  const result = await provider.generateContent(parsedInput);
  return GenerateContentResultSchema.parse(result) as GenerateContentResult;
}
