import { z } from "zod";

export const ClientIntakeInputSchema = z.object({
  businessName: z.string().min(1),
  industry: z.string().min(1),
  website: z.string().optional(),
  primaryGoal: z.enum(["leads", "traffic", "awareness", "hiring"]),
  targetAudience: z.string().optional(),
  offer: z.string().optional(),
  seasonality: z.string().optional(),
});

export type ClientIntakeInput = z.infer<typeof ClientIntakeInputSchema>;

export const ClientIntakeOutputSchema = z.object({
  offerDefinition: z.object({
    offer: z.string(),
    score: z.number().min(1).max(10),
    improvement: z.string().nullish(),
  }),
  campaignType: z.enum(["lead_generation", "foot_traffic", "authority_builder", "hiring", "event_promotion"]),
  bigIdea: z.string(),
  targetAudience: z.object({
    primary: z.string(),
    whyTheyRespond: z.string(),
  }),
});

export type ClientIntakeOutput = z.infer<typeof ClientIntakeOutputSchema>;

export function buildIntakeUserPrompt(input: ClientIntakeInput): string {
  const parts = [
    `Business Name: ${input.businessName}`,
    `Industry: ${input.industry}`,
    input.website ? `Website: ${input.website}` : null,
    `Primary Goal: ${input.primaryGoal}`,
    input.targetAudience ? `Target Audience: ${input.targetAudience}` : null,
    input.offer ? `Current Offer: ${input.offer}` : null,
    input.seasonality ? `Seasonality: ${input.seasonality}` : null,
  ].filter(Boolean).join("\n");

  return `Analyze this local business and create a campaign brief:\n\n${parts}\n\nRespond ONLY with a JSON object:\n{\n  "offerDefinition": { "offer": string, "score": number (1-10), "improvement": string | null },\n  "campaignType": "lead_generation" | "foot_traffic" | "authority_builder" | "hiring" | "event_promotion",\n  "bigIdea": string (one compelling sentence),\n  "targetAudience": { "primary": string, "whyTheyRespond": string }\n}`;
}
