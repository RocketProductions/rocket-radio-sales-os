import OpenAI from "openai";
import type { AIProvider } from "./index";
import type { GenerateContentInput, GenerateContentResult } from "@/types/content";

const SECTION_COUNTS: Record<string, number> = { short: 2, medium: 4, long: 6 };

function buildSystemPrompt(): string {
  return `You are an expert radio and local media sales strategist.
You help account executives build compelling campaign proposals, creative briefs, and client presentations.
Always respond with valid JSON in the exact shape requested. Do not add markdown fences or extra text.`;
}

function buildUserPrompt(input: GenerateContentInput): string {
  const sectionCount = SECTION_COUNTS[input.options?.length ?? "medium"];
  const toneNote = input.options?.tone ? `Tone: ${input.options.tone}.` : "";
  const audienceNote = input.options?.audience ? `Target audience: ${input.options.audience}.` : "";
  return `Generate a ${input.type} for the following objective:\n\n"${input.prompt}"\n\n${toneNote} ${audienceNote}\n\nRespond ONLY with a JSON object:\n{\n  "title": string,\n  "summary": string,\n  "sections": Array<{ "id": string, "title": string, "body": string }>\n}\n\nInclude exactly ${sectionCount} sections.`;
}

export interface ChatRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface VisionRequest {
  systemPrompt: string;
  userPrompt: string;
  imageUrl: string;
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o";
  }

  async generateContent(input: GenerateContentInput): Promise<GenerateContentResult> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      max_tokens: 2048,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI returned an empty response");
    try {
      return JSON.parse(raw) as GenerateContentResult;
    } catch {
      throw new Error(`OpenAI response was not valid JSON: ${raw.slice(0, 200)}`);
    }
  }

  /** Call OpenAI with an image URL + text prompt (vision). Returns raw JSON string. */
  async chatWithVision(request: VisionRequest): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",           // vision requires gpt-4o regardless of OPENAI_MODEL
      temperature: 0.2,          // low temp — we want precise color values
      max_tokens: 256,
      messages: [
        { role: "system", content: request.systemPrompt },
        {
          role: "user",
          content: [
            { type: "text",      text: request.userPrompt },
            { type: "image_url", image_url: { url: request.imageUrl, detail: "low" } },
          ],
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  /** Call OpenAI with a mode-specific system + user prompt, return raw JSON string */
  async chat(request: ChatRequest): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      max_tokens: 3000,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    // Strip markdown code fences if the model wraps output in ```json ... ```
    return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
}
