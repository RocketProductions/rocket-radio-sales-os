import { SYSTEM_PROMPTS, type CampaignModeType } from "@/ai/prompts/systemPrompts";
import {
  ClientIntakeInputSchema,
  ClientIntakeOutputSchema,
  buildIntakeUserPrompt,
  type ClientIntakeInput,
} from "./clientIntake";
import {
  RadioScriptInputSchema,
  RadioScriptOutputSchema,
  buildScriptUserPrompt,
  type RadioScriptInput,
} from "./radioScript";
import {
  FunnelCopyInputSchema,
  FunnelCopyOutputSchema,
  buildFunnelUserPrompt,
  type FunnelCopyInput,
} from "./funnelCopy";
import {
  FollowUpSequenceInputSchema,
  FollowUpSequenceOutputSchema,
  buildFollowUpUserPrompt,
  type FollowUpSequenceInput,
} from "./followUpSequence";
import type { z } from "zod";

export interface ModeConfig {
  systemPrompt: string;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  buildUserPrompt: (input: unknown) => string;
}

export const CAMPAIGN_MODES: Record<CampaignModeType, ModeConfig> = {
  "client-intake": {
    systemPrompt: SYSTEM_PROMPTS["client-intake"],
    inputSchema: ClientIntakeInputSchema,
    outputSchema: ClientIntakeOutputSchema,
    buildUserPrompt: (input) => buildIntakeUserPrompt(input as ClientIntakeInput),
  },
  "radio-script": {
    systemPrompt: SYSTEM_PROMPTS["radio-script"],
    inputSchema: RadioScriptInputSchema,
    outputSchema: RadioScriptOutputSchema,
    buildUserPrompt: (input) => buildScriptUserPrompt(input as RadioScriptInput),
  },
  "funnel-copy": {
    systemPrompt: SYSTEM_PROMPTS["funnel-copy"],
    inputSchema: FunnelCopyInputSchema,
    outputSchema: FunnelCopyOutputSchema,
    buildUserPrompt: (input) => buildFunnelUserPrompt(input as FunnelCopyInput),
  },
  "follow-up-sequence": {
    systemPrompt: SYSTEM_PROMPTS["follow-up-sequence"],
    inputSchema: FollowUpSequenceInputSchema,
    outputSchema: FollowUpSequenceOutputSchema,
    buildUserPrompt: (input) => buildFollowUpUserPrompt(input as FollowUpSequenceInput),
  },
};

export function isCampaignMode(type: string): type is CampaignModeType {
  return type in CAMPAIGN_MODES;
}
