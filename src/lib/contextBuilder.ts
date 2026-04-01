/**
 * contextBuilder.ts
 *
 * Builds two types of AI context at generation time:
 *
 * 1. clientDocContext  — text extracted from documents the client uploaded
 *    (menus, service lists, price sheets, past campaigns, etc.)
 *
 * 2. approvedExamples — approved assets from previous campaigns in the same
 *    industry. These are injected as few-shot examples so the AI learns from
 *    what has already worked. The more campaigns you approve, the better
 *    the examples become. This is the self-improvement loop.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

// ── Client document context ───────────────────────────────────────────────────

/**
 * Fetches extracted text from documents uploaded for this session.
 * Returns a formatted block ready to inject into any AI prompt, or null
 * if no documents have been uploaded / extracted for this session.
 */
export async function buildClientDocContext(sessionId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("brand_uploads")
      .select("file_name, category, extracted_text")
      .eq("session_id", sessionId)
      .eq("extraction_status", "extracted")
      .not("extracted_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(5); // cap at 5 docs to keep prompts manageable

    if (error || !data || data.length === 0) return null;

    const docs = (data as { file_name: string; category: string; extracted_text: string }[])
      .filter((d) => d.extracted_text?.trim());

    if (docs.length === 0) return null;

    const lines = [
      "--- CLIENT DOCUMENTS (uploaded materials — use to inform copy) ---",
      ...docs.map((d) =>
        `[${d.category.toUpperCase()}: ${d.file_name}]\n${d.extracted_text.slice(0, 1_500)}`
      ),
      "--- END CLIENT DOCUMENTS ---",
    ];

    return lines.join("\n\n");
  } catch {
    return null; // never block generation over missing context
  }
}

// ── Approved examples (few-shot self-improvement) ─────────────────────────────

type AssetType = "radio-script" | "funnel-copy" | "follow-up-sequence";

interface ApprovedExample {
  content: Record<string, unknown>;
  industry: string | null;
}

/**
 * Fetches up to 2 approved assets from the same industry as few-shot examples.
 *
 * Self-improvement mechanic:
 *   Every time a rep approves an asset, it enters the example pool.
 *   Future generations in the same industry receive those approved assets
 *   as style/tone reference. The pool grows with every campaign you run.
 */
export async function buildApprovedExamplesContext(
  industry: string,
  assetType: AssetType,
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();

    // Normalise industry for matching (e.g. "Home Services" → "home services")
    const industryNorm = industry.toLowerCase().trim();

    const { data, error } = await supabase
      .from("campaign_assets")
      .select("content, industry")
      .eq("asset_type", assetType)
      .eq("status", "approved")
      .ilike("industry", industryNorm)
      .order("updated_at", { ascending: false })
      .limit(2);

    if (error || !data || data.length === 0) return null;

    const examples = data as ApprovedExample[];

    const label =
      assetType === "radio-script"
        ? "RADIO SCRIPTS"
        : assetType === "funnel-copy"
        ? "LANDING PAGE COPY"
        : "FOLLOW-UP SEQUENCES";

    const lines = [
      `--- APPROVED ${label} FROM SIMILAR BUSINESSES (${industry}) ---`,
      `These performed well for comparable local businesses.`,
      `Use them as tone and style references only — write original copy for this client.`,
      "",
    ];

    examples.forEach((ex, i) => {
      lines.push(`Example ${i + 1}:`);
      if (assetType === "radio-script") {
        const c = ex.content as { script?: string; framework?: string };
        if (c.framework) lines.push(`Framework: ${c.framework}`);
        if (c.script) lines.push(`Script: "${c.script.trim()}"`);
      } else if (assetType === "funnel-copy") {
        const c = ex.content as { headline?: string; subheadline?: string; ctaText?: string };
        if (c.headline) lines.push(`Headline: "${c.headline}"`);
        if (c.subheadline) lines.push(`Subheadline: "${c.subheadline}"`);
        if (c.ctaText) lines.push(`CTA: "${c.ctaText}"`);
      } else {
        const c = ex.content as { messages?: Array<{ channel: string; body: string }> };
        if (c.messages?.[0]) {
          lines.push(`Instant text: "${c.messages[0].body.trim()}"`);
        }
      }
      lines.push("");
    });

    lines.push(`--- END EXAMPLES ---`);

    return lines.join("\n");
  } catch {
    return null;
  }
}

// ── Combined enrichment ───────────────────────────────────────────────────────

/**
 * One call that returns both context strings in parallel.
 * Either can be null if no data exists yet.
 */
export async function enrichGenerationInput(opts: {
  sessionId?: string;
  industry?: string;
  assetType: AssetType;
}): Promise<{ clientDocContext: string | null; approvedExamples: string | null }> {
  const [clientDocContext, approvedExamples] = await Promise.all([
    opts.sessionId ? buildClientDocContext(opts.sessionId) : Promise.resolve(null),
    opts.industry  ? buildApprovedExamplesContext(opts.industry, opts.assetType) : Promise.resolve(null),
  ]);

  return { clientDocContext, approvedExamples };
}
