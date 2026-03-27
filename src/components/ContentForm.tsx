"use client";

import { useState } from "react";
import type { ContentType, GenerateContentResult } from "@/types/content";

interface Props {
  onResult: (result: GenerateContentResult) => void;
  onError: (message: string) => void;
}

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "brief", label: "Campaign Brief" },
  { value: "presentation", label: "Client Presentation" },
  { value: "post", label: "Social Post" },
];

export function ContentForm({ onResult, onError }: Props) {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<ContentType>("brief");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    onError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type, options: { tone: tone || undefined, audience: audience || undefined, length } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Request failed");
      onResult(json.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="type" style={{ display: "block", marginBottom: 4 }}>Content Type</label>
        <select id="type" value={type} onChange={(e) => setType(e.target.value as ContentType)} style={{ width: "100%", padding: 8 }}>
          {CONTENT_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="prompt" style={{ display: "block", marginBottom: 4 }}>Prompt / Business Objective</label>
        <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Drive foot traffic for a local car dealership during Memorial Day weekend"
          rows={6} style={{ width: "100%", padding: 8 }} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="tone" style={{ display: "block", marginBottom: 4 }}>Tone (optional)</label>
          <input id="tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Enthusiastic" style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="audience" style={{ display: "block", marginBottom: 4 }}>Audience (optional)</label>
          <input id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Adults 25-54" style={{ width: "100%", padding: 8 }} />
        </div>
        <div>
          <label htmlFor="length" style={{ display: "block", marginBottom: 4 }}>Length</label>
          <select id="length" value={length} onChange={(e) => setLength(e.target.value as typeof length)} style={{ padding: 8 }}>
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
      </div>
      <button type="submit" disabled={loading || !prompt.trim()} style={{ padding: "10px 24px", fontSize: 16 }}>
        {loading ? "Generating..." : "Generate"}
      </button>
    </form>
  );
}
