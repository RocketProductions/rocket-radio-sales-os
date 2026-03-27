import { z } from "zod";

export const GenerateContentInputSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(["presentation", "post", "brief"]),
  options: z
    .object({
      tone: z.string().optional(),
      audience: z.string().optional(),
      length: z.enum(["short", "medium", "long"]).optional(),
    })
    .optional(),
});

export const GenerateContentResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
    })
  ),
});