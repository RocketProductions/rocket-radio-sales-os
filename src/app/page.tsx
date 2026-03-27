"use client";

import { ContentForm } from "@/components/ContentForm";
import { OutputPreview } from "@/components/OutputPreview";
import { useContentState } from "@/state/useContentState";

export default function HomePage() {
  const { result, error, setResult, setError } = useContentState();
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Rocket Radio Sales OS</h1>
      <ContentForm
        onResult={(res) => { setError(""); setResult(res); }}
        onError={(msg) => { setResult(null); setError(msg); }}
      />
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      <OutputPreview result={result} />
    </main>
  );
}
