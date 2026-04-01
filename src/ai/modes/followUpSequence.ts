import { z } from "zod";

export const FollowUpSequenceInputSchema = z.object({
  businessName:     z.string().min(1),
  industry:         z.string().min(1),
  offer:            z.string().min(1),
  contactName:      z.string().optional(),
  serviceRequested: z.string().optional(),
  brandContext:     z.string().optional(),
  // Brief context — flows from intake step
  bigIdea:          z.string().optional(),
  campaignType:     z.string().optional(),
  // Self-improving context
  clientDocContext: z.string().optional(),
  approvedExamples: z.string().optional(),
  // Routing (used by generate route only)
  sessionId:        z.string().optional(),
});

export type FollowUpSequenceInput = z.infer<typeof FollowUpSequenceInputSchema>;

const MessageSchema = z.object({
  step:    z.number(),
  timing:  z.string(),
  channel: z.enum(["text", "email"]),
  subject: z.string().nullish(),
  body:    z.string(),
  angle:   z.string(),
});

export const FollowUpSequenceOutputSchema = z.object({
  messages:       z.array(MessageSchema).min(5).max(5),
  conversionGoal: z.string(),
  toneNotes:      z.string().nullish(),
});

export type FollowUpSequenceOutput = z.infer<typeof FollowUpSequenceOutputSchema>;

export function buildFollowUpUserPrompt(input: FollowUpSequenceInput): string {
  const parts = [
    `Business: ${input.businessName} (${input.industry})`,
    `Offer: ${input.offer}`,
    input.contactName      ? `Lead Name: ${input.contactName}`                          : "Lead Name: {{first_name}}",
    input.serviceRequested ? `Service Requested: ${input.serviceRequested}`             : null,
    input.bigIdea          ? `Campaign Big Idea: "${input.bigIdea}"`                    : null,
    input.campaignType     ? `Campaign Type: ${input.campaignType.replace(/_/g, " ")}` : null,
    input.brandContext     ? `\n${input.brandContext}`                                  : null,
    input.clientDocContext ? `\n${input.clientDocContext}`                              : null,
    input.approvedExamples ? `\n${input.approvedExamples}`                             : null,
  ].filter(Boolean).join("\n");

  return `Write a 5-touch follow-up sequence for this business:\n\n${parts}\n\nUse {{first_name}} as a placeholder for the lead's name.\n\nRespond ONLY with a JSON object:\n{\n  "messages": [\n    {\n      "step": number (1-5),\n      "timing": string ("instant" | "day 1" | "day 3" | "day 7" | "day 14"),\n      "channel": "text" | "email",\n      "subject": string | null (email only),\n      "body": string,\n      "angle": string (what makes this message different)\n    }\n  ],\n  "conversionGoal": string (e.g. "Book a free estimate"),\n  "toneNotes": string | null\n}`;
}
