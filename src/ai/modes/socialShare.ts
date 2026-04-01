import { z } from "zod";

export const SOCIAL_SHARE_SYSTEM_PROMPT = `You are an expert social media copywriter specializing in local business advertising and paid social campaigns. You write platform-native copy that drives clicks, engagement, and conversions.

Always respond with valid JSON in the exact shape requested. Do not add markdown fences or extra text. No emojis unless they feel natural for the platform.`;

export const SocialShareInputSchema = z.object({
  businessName: z.string().min(1),
  offer: z.string().min(1),
  landingPageUrl: z.string().url(),
  headline: z.string().optional(),
  targetAudience: z.string().optional(),
  industry: z.string().optional(),
  brandContext: z.string().optional(),
});

export type SocialShareInput = z.infer<typeof SocialShareInputSchema>;

export const SocialShareOutputSchema = z.object({
  facebook: z.string(),
  linkedin: z.string(),
  instagram: z.string(),
  twitter: z.string().max(280),
  boostTip: z.string(),
});

export type SocialShareOutput = z.infer<typeof SocialShareOutputSchema>;

export function buildSocialShareUserPrompt(input: SocialShareInput): string {
  const parts = [
    `Business: ${input.businessName}`,
    input.industry ? `Industry: ${input.industry}` : null,
    `Offer: ${input.offer}`,
    input.headline ? `Headline/Hook: ${input.headline}` : null,
    input.targetAudience ? `Target Audience: ${input.targetAudience}` : null,
    `Landing Page URL: ${input.landingPageUrl}`,
    input.brandContext ? `\nBrand Context:\n${input.brandContext}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Generate platform-native social media post copy for this local business campaign:

${parts}

Write one post for each platform following these rules:

FACEBOOK: Conversational and community-focused. Can use 1-3 relevant emojis where they feel natural. Up to 300 words. Include the landing page URL naturally within the copy (e.g., "Check it out at [URL]" or at the end). Tell a mini-story or lead with a relatable hook.

LINKEDIN: Professional tone, benefit-focused, 3-5 sentences. Speak to the business value or outcome. No hashtag spam — at most 2 targeted hashtags at the end. Do NOT include the URL in the post body (LinkedIn previews the link automatically). End with a clear, professional call to action.

INSTAGRAM: Visual and aspirational language. Write as if describing something worth seeing. Include 5-8 highly relevant hashtags at the end of the caption. End with "Link in bio." Do NOT include the full URL in the copy.

TWITTER: Write a punchy, curiosity-driven hook followed by the landing page URL. The TOTAL character count of the entire twitter value (including the URL) MUST be under 240 characters. Be direct and specific about the offer. One sentence max before the URL.

BOOST TIP: 1-2 sentences advising how to run this as a paid Facebook/Instagram boost or ad — audience targeting, budget, or format tip specific to this type of offer.

Respond ONLY with a JSON object:
{
  "facebook": string,
  "linkedin": string,
  "instagram": string,
  "twitter": string (MUST be under 240 characters total including the URL),
  "boostTip": string
}`;
}
