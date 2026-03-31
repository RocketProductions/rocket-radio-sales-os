/**
 * Pre-built follow-up sequences.
 *
 * Each step defines: timing, channel, and a template function
 * that takes lead data and returns the message.
 *
 * Timing is in minutes from lead creation:
 * - Step 1: 0 (instant)
 * - Step 2: 1440 (day 1)
 * - Step 3: 4320 (day 3)
 * - Step 4: 10080 (day 7)
 * - Step 5: 20160 (day 14)
 */

export interface SequenceStep {
  step: number;
  delayMinutes: number;
  channel: "text" | "email";
  buildMessage: (lead: LeadContext) => { subject?: string; body: string };
}

export interface LeadContext {
  firstName: string;
  businessName: string;
  offer: string;
}

/** Default 5-touch sequence for local lead generation */
export const DEFAULT_SEQUENCE: SequenceStep[] = [
  {
    step: 1,
    delayMinutes: 0, // Instant
    channel: "text",
    buildMessage: (ctx) => ({
      body: `Hi ${ctx.firstName}! Thanks for your interest in ${ctx.businessName}. We got your info and someone will be in touch shortly. Reply here if you have any questions!`,
    }),
  },
  {
    step: 2,
    delayMinutes: 1440, // Day 1
    channel: "email",
    buildMessage: (ctx) => ({
      subject: `Thanks for reaching out to ${ctx.businessName}`,
      body: `Hi ${ctx.firstName},\n\nWe wanted to follow up on your inquiry about ${ctx.offer}. We'd love to help — the easiest next step is to give us a quick call or reply to this email with a good time to chat.\n\nLooking forward to helping you out!\n\n- The ${ctx.businessName} Team`,
    }),
  },
  {
    step: 3,
    delayMinutes: 4320, // Day 3
    channel: "text",
    buildMessage: (ctx) => ({
      body: `Hey ${ctx.firstName}, just checking in from ${ctx.businessName}. Still interested in ${ctx.offer}? Happy to answer any questions. Just reply here!`,
    }),
  },
  {
    step: 4,
    delayMinutes: 10080, // Day 7
    channel: "email",
    buildMessage: (ctx) => ({
      subject: `Quick question, ${ctx.firstName}`,
      body: `Hi ${ctx.firstName},\n\nWe noticed you were interested in ${ctx.offer} from ${ctx.businessName}. Is this still something you need help with?\n\nNo pressure — just wanted to make sure we didn't miss you. Feel free to call or reply anytime.\n\nBest,\n${ctx.businessName}`,
    }),
  },
  {
    step: 5,
    delayMinutes: 20160, // Day 14
    channel: "text",
    buildMessage: (ctx) => ({
      body: `Hi ${ctx.firstName}, last follow-up from ${ctx.businessName}. If you ever need ${ctx.offer}, we're here. Just text back anytime!`,
    }),
  },
];
