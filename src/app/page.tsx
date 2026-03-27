"use client";

import { useState } from "react";
import { ContentForm } from "@/components/ContentForm";
import { OutputPreview } from "@/components/OutputPreview";
import type { GenerateContentResult } from "@/types/content";

export default function HomePage() {
  const [result, setResult] = useState<GenerateContentResult | null>(null);
  const [error, setError] = useState<string>("");

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Rocket Radio Sales OS</h1>
      <ContentForm
        onResult={(res) => {
          setError("");
          setResult(res);
        }}
        onError={(msg) => {
          setResult(null);
          setError(msg);
        }}
      />
      {error && <p role="alert">{error}</p>}
      <OutputPreview result={result} />
    </main>
  );
}