/**
 * documentExtractor.ts
 *
 * Extracts plain text from uploaded documents (PDF, DOCX, TXT).
 * Used at upload time to populate brand_uploads.extracted_text.
 * Failures are non-fatal — returns null so the upload still succeeds.
 */

/** Max characters to store — keeps prompts from blowing up on huge files */
const MAX_CHARS = 8_000;

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ text: string | null; status: "extracted" | "unsupported" | "failed" }> {
  const name = fileName.toLowerCase();

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      const text = data.text?.replace(/\s+/g, " ").trim();
      return {
        text: text ? text.slice(0, MAX_CHARS) : null,
        status: text ? "extracted" : "failed",
      };
    } catch {
      return { text: null, status: "failed" };
    }
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth") as {
        extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value?.replace(/\s+/g, " ").trim();
      return {
        text: text ? text.slice(0, MAX_CHARS) : null,
        status: text ? "extracted" : "failed",
      };
    } catch {
      return { text: null, status: "failed" };
    }
  }

  // ── Plain text ────────────────────────────────────────────────────────────
  if (mimeType === "text/plain" || name.endsWith(".txt")) {
    try {
      const text = buffer.toString("utf-8").replace(/\s+/g, " ").trim();
      return {
        text: text ? text.slice(0, MAX_CHARS) : null,
        status: text ? "extracted" : "failed",
      };
    } catch {
      return { text: null, status: "failed" };
    }
  }

  // ── Images / other — no text to extract ──────────────────────────────────
  return { text: null, status: "unsupported" };
}
