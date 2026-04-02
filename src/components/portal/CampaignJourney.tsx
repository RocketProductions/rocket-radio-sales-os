"use client";

import { cn } from "@/lib/utils";
import {
  Radio, Globe, Zap, UserCheck, Target, Award, CalendarCheck, Trophy, Check,
} from "lucide-react";

export interface Milestone {
  key: string;
  label: string;
  description: string;
  celebration?: string; // shown when milestone is reached
  icon: React.ElementType;
  reached: boolean;
  value?: string | number; // optional metric to display
}

interface CampaignJourneyProps {
  milestones: Milestone[];
}

export function CampaignJourney({ milestones }: CampaignJourneyProps) {
  // Find the first unreached milestone (the "current" one)
  const currentIdx = milestones.findIndex((m) => !m.reached);
  const allComplete = currentIdx === -1;

  return (
    <div className="space-y-0">
      {milestones.map((m, i) => {
        const isReached = m.reached;
        const isCurrent = i === currentIdx;
        const isFuture = !isReached && !isCurrent;
        const isLast = i === milestones.length - 1;

        return (
          <div key={m.key} className="flex gap-4">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center shrink-0 w-8">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isReached && "border-[#D4A853] bg-[#D4A853] text-white",
                  isCurrent && "border-[#D4A853] bg-white text-[#D4A853] shadow-md shadow-[#D4A853]/20 animate-pulse",
                  isFuture && "border-[#E5E1D8] bg-white text-[#E5E1D8]",
                )}
              >
                {isReached ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <m.icon className="h-4 w-4" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px] transition-colors",
                    isReached ? "bg-[#D4A853]" : "bg-[#E5E1D8]",
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isReached && "text-[#0B1D3A]",
                    isCurrent && "text-[#0B1D3A]",
                    isFuture && "text-[#E5E1D8]",
                  )}
                >
                  {m.label}
                </p>
                {m.value && isReached && (
                  <span className="rounded-full bg-[#D4A853]/10 px-2 py-0.5 text-[10px] font-bold text-[#D4A853]">
                    {m.value}
                  </span>
                )}
              </div>

              {/* Description or celebration */}
              {isReached && m.celebration ? (
                <p className="mt-0.5 text-xs text-[#1B7A4A] font-medium">{m.celebration}</p>
              ) : (
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    isFuture ? "text-[#E5E1D8]" : "text-[#5C6370]",
                  )}
                >
                  {m.description}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {allComplete && (
        <div className="mt-4 rounded-xl bg-[#D4A853]/10 px-4 py-3 text-center">
          <Trophy className="h-5 w-5 text-[#D4A853] mx-auto mb-1" />
          <p className="text-sm font-semibold text-[#0B1D3A]">Campaign fully active!</p>
          <p className="text-xs text-[#5C6370] mt-0.5">Every milestone reached. Your campaign is performing.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Build milestones from real campaign data.
 * Called server-side in the portal page.
 */
export function buildMilestones(data: {
  campaignActive: boolean;
  lpLive: boolean;
  lpUrl: string | null;
  hasPixel: boolean;
  totalLeads: number;
  firstLeadName: string | null;
  bookedCount: number;
  closedCount: number;
}): Milestone[] {
  return [
    {
      key: "campaign-live",
      label: "Campaign Live",
      description: "Your radio ad is on the air",
      celebration: "Your campaign is running on 95.3 MNC!",
      icon: Radio,
      reached: data.campaignActive,
    },
    {
      key: "lp-active",
      label: "Landing Page Active",
      description: "Your page is ready to capture visitors",
      celebration: data.lpUrl
        ? "Your landing page is live and capturing visitors"
        : "Landing page is published!",
      icon: Globe,
      reached: data.lpLive,
    },
    {
      key: "auto-response",
      label: "Auto-Response Armed",
      description: "Every lead will get a text in under 60 seconds",
      celebration: "Instant follow-up is active — fastest in market",
      icon: Zap,
      reached: data.campaignActive, // always active if campaign exists
    },
    {
      key: "first-lead",
      label: "First Lead",
      description: "Waiting for your first form submission",
      celebration: data.firstLeadName
        ? `${data.firstLeadName} was your first lead — we already responded!`
        : "Your first lead came in — we already responded!",
      icon: UserCheck,
      reached: data.totalLeads >= 1,
      value: data.totalLeads >= 1 ? `${data.totalLeads} total` : undefined,
    },
    {
      key: "retargeting",
      label: "Visitor Retargeting",
      description: "We'll show your ad to visitors who didn't call yet",
      celebration: "People who visited your page are seeing your ad on social media",
      icon: Target,
      reached: data.hasPixel && data.totalLeads >= 1,
    },
    {
      key: "ten-leads",
      label: "10 Leads",
      description: "Reaching this milestone means your campaign is working",
      celebration: "Your campaign is generating consistent leads!",
      icon: Award,
      reached: data.totalLeads >= 10,
      value: data.totalLeads >= 10 ? `${data.totalLeads} leads` : undefined,
    },
    {
      key: "first-booking",
      label: "First Booking",
      description: "A lead books an appointment or schedules a call",
      celebration: "Someone booked — your campaign drove a real appointment!",
      icon: CalendarCheck,
      reached: data.bookedCount >= 1,
      value: data.bookedCount >= 1 ? `${data.bookedCount} booked` : undefined,
    },
    {
      key: "first-close",
      label: "First Customer",
      description: "A lead becomes a paying customer",
      celebration: "You just got a new customer from your radio campaign!",
      icon: Trophy,
      reached: data.closedCount >= 1,
      value: data.closedCount >= 1 ? `${data.closedCount} closed` : undefined,
    },
  ];
}
