"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SuggestionActionsProps {
  suggestionId: string;
  onSettled?: (newStatus: "applied" | "dismissed") => void;
}

export function SuggestionActions({ suggestionId, onSettled }: SuggestionActionsProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "applied" | "dismissed">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "apply" | "dismiss") {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/content-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: suggestionId, action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const newStatus = action === "apply" ? "applied" : "dismissed";
      setStatus(newStatus);
      onSettled?.(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  if (status === "applied") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rocket-success">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Applied
      </span>
    );
  }

  if (status === "dismissed") {
    return (
      <span className="text-sm text-rocket-muted">Dismissed</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => handleAction("apply")}
        disabled={status === "loading"}
        className="bg-rocket-accent text-rocket-dark hover:bg-rocket-accent/90"
      >
        {status === "loading" ? "Applying..." : "Apply"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleAction("dismiss")}
        disabled={status === "loading"}
      >
        Dismiss
      </Button>
      {error && <span className="text-xs text-rocket-danger">{error}</span>}
    </div>
  );
}
