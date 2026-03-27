import type { AIProvider } from "./index";
import type { GenerateContentInput, GenerateContentResult } from "@/types/content";

/**
 * OpenAIProvider is a stub implementation of AIProvider. Replace the
 * implementation with real API calls when adding provider support.
 */
export class OpenAIProvider implements AIProvider {
  async generateContent(
    input: GenerateContentInput
  ): Promise<GenerateContentResult> {
    // TODO: Replace with actual OpenAI API call. This stub returns a
    // deterministic response to validate the data flow.
    return {
      title: `Draft ${input.type}`,
      summary: "This is a stub response. Replace with real AI output.",
      sections: [
        {
          id: "section-1",
          title: "Overview",
          body: input.prompt,
        },
      ],
    };
  }
}