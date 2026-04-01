"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

const STAGES = [
  { key: "new",       label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "booked",    label: "Booked" },
  { key: "closed",    label: "Closed" },
] as const;

type LeadStatus = "new" | "contacted" | "booked" | "closed" | "lost";

interface FunnelProgressProps {
  status: LeadStatus;
}

export function FunnelProgress({ status }: FunnelProgressProps) {
  const isLost = status === "lost";

  // Index of the current stage (lost = stays at last active position visually)
  const stageKeys = STAGES.map((s) => s.key);
  const currentIdx = isLost
    ? stageKeys.indexOf("contacted") // lost usually happens after first contact
    : stageKeys.indexOf(status as (typeof stageKeys)[number]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-0">
        {STAGES.map((stage, i) => {
          const isDone    = i < currentIdx;
          const isCurrent = i === currentIdx && !isLost;
          const isFuture  = i > currentIdx || (isLost && i > 1);

          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              {/* Node */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isDone    && "border-rocket-blue bg-rocket-blue text-white",
                    isCurrent && "border-rocket-accent bg-rocket-accent text-white shadow-md shadow-rocket-accent/30",
                    isFuture  && "border-slate-200 bg-white text-slate-400",
                    isLost    && i <= 1 && "border-red-400 bg-red-400 text-white",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1 text-xs font-medium whitespace-nowrap",
                    isCurrent && "text-rocket-accent",
                    isDone    && "text-rocket-blue",
                    isFuture  && "text-slate-400",
                    isLost    && i <= 1 && "text-red-500",
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line (not after last item) */}
              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 rounded-full transition-colors",
                    i < currentIdx ? "bg-rocket-blue" : "bg-slate-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Lost badge — shown below the progress strip */}
      {isLost && (
        <p className="mt-2 text-xs font-medium text-red-500 text-center">
          Marked as lost — automation stopped
        </p>
      )}
    </div>
  );
}
