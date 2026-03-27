import type { GenerateContentInput, GenerateContentResult } from "@/types/content";

export interface AIProvider {
  generateContent(input: GenerateContentInput): Promise<GenerateContentResult>;
}