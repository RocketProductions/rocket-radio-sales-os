"use client";

import { useState } from "react";
import type { GenerateContentResult } from "@/types/content";

/**
 * A simple hook to manage the content generation state. In a real app this
 * would likely be replaced by a more robust state management solution
 * (e.g. Zustand, Redux, or React context), but this stub demonstrates the
 * basic pattern.
 */
export function useContentState() {
  const [result, setResult] = useState<GenerateContentResult | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  return {
    result,
    error,
    loading,
    setResult,
    setError,
    setLoading,
  };
}