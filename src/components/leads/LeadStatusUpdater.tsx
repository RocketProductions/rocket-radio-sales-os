"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  new:       { label: "Mark Contacted", next: "contacted" },
  contacted: { label: "Mark Booked",    next: "booked" },
  booked:    { label: "Mark Closed",    next: "closed" },
  closed:    { label: "Reopen",         next: "new" },
  lost:      { label: "Reopen",         next: "new" },
};

const ALL_STATUSES = [
  { value: "new",       label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "booked",    label: "Booked" },
  { value: "closed",    label: "Closed" },
  { value: "lost",      label: "Lost" },
];

interface LeadStatusUpdaterProps {
  leadId: string;
  currentStatus: string;
}

export function LeadStatusUpdater({ leadId, currentStatus }: LeadStatusUpdaterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  async function updateStatus(newStatus: string) {
    setOpen(false);
    startTransition(async () => {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    });
  }

  const quickAction = NEXT_STATUS[currentStatus];

  return (
    <div className="relative">
      <div className="flex items-center">
        {quickAction && currentStatus !== "closed" && (
          <button
            onClick={() => updateStatus(quickAction.next)}
            disabled={isPending}
            className="rounded-l-md border border-rocket-border bg-white px-2 py-1 text-xs font-medium text-rocket-dark hover:bg-rocket-bg disabled:opacity-50 transition-colors"
          >
            {isPending ? "…" : quickAction.label}
          </button>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={isPending}
          className="rounded-r-md border border-l-0 border-rocket-border bg-white p-1 text-rocket-muted hover:bg-rocket-bg disabled:opacity-50 transition-colors"
          style={currentStatus === "closed" ? { borderRadius: "0.375rem", borderLeft: "1px solid" } : {}}
          aria-label="More status options"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-rocket-border bg-white shadow-lg">
            {ALL_STATUSES.filter((s) => s.value !== currentStatus).map((s) => (
              <button
                key={s.value}
                onClick={() => updateStatus(s.value)}
                className="block w-full px-3 py-2 text-left text-xs text-rocket-dark hover:bg-rocket-bg transition-colors first:rounded-t-md last:rounded-b-md"
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
