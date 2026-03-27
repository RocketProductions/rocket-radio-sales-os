import { z } from "zod";

export const GenerateContentInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  type: z.enum(["presentation", "post", "brief"]),
  tenantId: z.string().optional(),
  options: z.object({
    tone: z.string().optional(),
    audience: z.string().optional(),
    length: z.enum(["short", "medium", "long"]).optional(),
  }).optional(),
});

export const GenerateContentResultSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
  })).min(1),
});
