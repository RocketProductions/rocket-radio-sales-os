"use client";

import { useState } from "react";
import type { GenerateContentResult } from "@/types/content";

interface Props {
  onResult: (result: GenerateContentResult) => void;
  onError: (message: string) => void;
}

/**
 * ContentForm collects the user prompt and sends a POST request to the
 * `/api/generate` endpoint. It handles loading, success and error states.
 */
export function ContentForm({ onResult, onError }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    onError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type: "brief", options: { length: "short" } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Request failed");
      onResult(json.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter a content prompt"
        rows={6}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button type="submit" disabled={loading || !prompt.trim()}>
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}