import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateContent } from "@/ai/generateContent";
import { OpenAIProvider } from "@/ai/providers/openaiProvider";

vi.mock("@/ai/providers/openaiProvider", () => ({
  OpenAIProvider: vi.fn().mockImplementation(() => ({
    generateContent: vi.fn().mockResolvedValue({
      title: "Mock Campaign Brief",
      summary: "A mock summary for testing.",
      sections: [
        { id: "section-1", title: "Campaign Overview", body: "Mock body one." },
        { id: "section-2", title: "Target Audience", body: "Adults 25-54 in the local market." },
      ],
    }),
  })),
}));

describe("generateContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns valid structure for a brief", async () => {
    const result = await generateContent({ prompt: "Drive Memorial Day foot traffic", type: "brief" });
    expect(result.title).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.sections[0]).toHaveProperty("id");
    expect(result.sections[0]).toHaveProperty("title");
    expect(result.sections[0]).toHaveProperty("body");
  });

  it("throws on empty prompt", async () => {
    await expect(generateContent({ prompt: "", type: "brief" })).rejects.toThrow();
  });

  it("calls OpenAIProvider once", async () => {
    await generateContent({ prompt: "Test prompt", type: "post" });
    expect(OpenAIProvider).toHaveBeenCalledOnce();
  });
});
