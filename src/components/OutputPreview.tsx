import type { GenerateContentResult } from "@/types/content";

interface Props {
  result: GenerateContentResult | null;
}

/**
 * OutputPreview renders the AI-generated content, including title,
 * summary and sections. If no result is provided, it renders nothing.
 */
export function OutputPreview({ result }: Props) {
  if (!result) return null;
  return (
    <section style={{ marginTop: 24 }}>
      <h2>{result.title}</h2>
      <p>{result.summary}</p>
      {result.sections.map((section) => (
        <article key={section.id} style={{ marginTop: 16 }}>
          <h3>{section.title}</h3>
          <p>{section.body}</p>
        </article>
      ))}
    </section>
  );
}