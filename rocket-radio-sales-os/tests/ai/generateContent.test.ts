import { describe, it, expect } from "vitest";
import { generateContent } from "@/ai/generateContent";

describe("generateContent", () => {
  it("returns valid structure", async () => {
    const result = await generateContent({
      prompt: "Test prompt",
      type: "brief",
    });
    expect(result.title).toBeTruthy();
    expect(result.sections.length).toBeGreaterThan(0);
  });
});