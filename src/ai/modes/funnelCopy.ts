import { z } from "zod";

export const FunnelCopyInputSchema = z.object({
  businessName: z.string().min(1),
  industry: z.string().min(1),
  offer: z.string().min(1),
  targetAudience: z.string().optional(),
  trustPoints: z.array(z.string()).optional(),
});

export type FunnelCopyInput = z.infer<typeof FunnelCopyInputSchema>;

export const FunnelCopyOutputSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  bodyCopy: z.array(z.string()),
  trustElements: z.array(z.string()),
  ctaText: z.string(),
  formFields: z.array(z.object({
    name: z.string(),
    type: z.enum(["text", "email", "phone", "select", "textarea"]),
    required: z.boolean(),
    placeholder: z.string().nullish(),
  })),
});

export type FunnelCopyOutput = z.infer<typeof FunnelCopyOutputSchema>;

export function buildFunnelUserPrompt(input: FunnelCopyInput): string {
  const parts = [
    `Business: ${input.businessName} (${input.industry})`,
    `Offer: ${input.offer}`,
    input.targetAudience ? `Audience: ${input.targetAudience}` : null,
    input.trustPoints?.length ? `Trust Points: ${input.trustPoints.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  return `Write landing page copy for this local business:\n\n${parts}\n\nRespond ONLY with a JSON object:\n{\n  "headline": string (under 10 words, benefit-driven),\n  "subheadline": string,\n  "bodyCopy": string[] (2-3 short paragraphs),\n  "trustElements": string[] (3-4 credibility points),\n  "ctaText": string (specific button text, not "Submit"),\n  "formFields": Array<{ "name": string, "type": "text"|"email"|"phone"|"select"|"textarea", "required": boolean, "placeholder": string? }>\n}`;
}
