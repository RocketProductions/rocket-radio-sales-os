"use client";

import { useState, useCallback } from "react";
import type { GenerateContentResult } from "@/types/content";

export function useContentState() {
  const [result, setResult] = useState<GenerateContentResult | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const reset = useCallback(() => { setResult(null); setError(""); setLoading(false); }, []);
  return { result, error, loading, setResult, setError, setLoading, reset };
}
