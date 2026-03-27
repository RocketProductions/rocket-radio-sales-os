import type { GenerateContentResult } from "@/types/content";

export function OutputPreview({ result }: { result: GenerateContentResult | null }) {
  if (!result) return null;
  return (
    <section style={{ marginTop: 32, padding: 24, border: "1px solid #e0e0e0", borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>{result.title}</h2>
      <p style={{ color: "#555", fontStyle: "italic" }}>{result.summary}</p>
      <hr />
      {result.sections.map((s) => (
        <article key={s.id} style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{s.body}</p>
        </article>
      ))}
    </section>
  );
}
