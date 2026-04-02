/**
 * GET /api/cron/optimize-content
 *
 * Agent 5: Content Optimization.
 * Auto-detects underperforming landing pages and suggests improvements.
 * Runs weekly via Vercel Cron.
 *
 * Logic:
 *   1. Fetch all live landing pages
 *   2. Count leads in last 30 days per page
 *   3. Flag pages with < 5 leads (skip pages < 14 days old)
 *   4. Send underperforming page content to Claude for CRO analysis
 *   5. Save suggestions to content_suggestions table
 *   6. Email summary to the managing rep
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaudeJson } from "@/lib/claude";
import { sendEmailViaResend } from "@/integrations/email";
import { emailWrapper, emailInfo, emailButton } from "@/lib/emailTemplate";

export const dynamic = "force-dynamic";

const REP_EMAIL = process.env.REP_NOTIFICATION_EMAIL ?? "christopher.alumbaugh@gmail.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";
const MAX_PAGES_PER_RUN = 5;

const CRO_SYSTEM_PROMPT = `You are a conversion rate optimization expert for local business landing pages. Analyze the current copy and suggest specific improvements. Focus on: headline clarity, offer specificity, urgency, trust elements, CTA strength, and form friction. Every suggestion must explain WHY it would improve conversion. Return JSON.`;

interface ContentSuggestion {
  type: "headline" | "body" | "cta" | "form";
  original: string;
  suggested: string;
  reasoning: string;
}

interface ClaudeOptimizationResult {
  suggestions: ContentSuggestion[];
  overallScore: number;
  topPriority: string;
}

interface LandingPageContent {
  headline?: string;
  subheadline?: string;
  bodyCopy?: string[];
  ctaText?: string;
  formFields?: Array<{ name: string; type: string; required: boolean; placeholder?: string | null }>;
  trustElements?: string[];
}

interface LandingPageRow {
  id: string;
  session_id: string | null;
  business_name: string | null;
  content: LandingPageContent;
  lead_count: number | null;
  created_at: string;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

  console.log("[optimize-content] Starting content optimization run");

  // 1. Fetch all live landing pages
  const { data: pages, error: pagesError } = await supabase
    .from("landing_pages")
    .select("id, session_id, business_name, content, lead_count, created_at")
    .eq("is_live", true);

  if (pagesError) {
    console.error("[optimize-content] Error fetching pages:", pagesError.message);
    return NextResponse.json({ ok: false, error: pagesError.message }, { status: 500 });
  }

  if (!pages || pages.length === 0) {
    console.log("[optimize-content] No live landing pages found");
    return NextResponse.json({ ok: true, suggestions: 0, reason: "no live pages" });
  }

  const livePages = pages as LandingPageRow[];
  console.log(`[optimize-content] Found ${livePages.length} live landing pages`);

  // 2. Identify underperforming pages
  const underperforming: Array<LandingPageRow & { recentLeadCount: number }> = [];

  for (const page of livePages) {
    // Skip pages published less than 14 days ago
    const pageCreated = new Date(page.created_at);
    if (pageCreated > fourteenDaysAgo) {
      console.log(`[optimize-content] Skipping ${page.business_name ?? page.id} — too new (${Math.floor((now.getTime() - pageCreated.getTime()) / 86400000)} days old)`);
      continue;
    }

    // Count leads in last 30 days
    const { count } = await supabase
      .from("lp_leads")
      .select("*", { count: "exact", head: true })
      .eq("landing_page_id", page.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const recentLeadCount = count ?? 0;

    // Flag pages with fewer than 5 leads in the last 30 days
    if (recentLeadCount < 5) {
      underperforming.push({ ...page, recentLeadCount });
    }
  }

  if (underperforming.length === 0) {
    console.log("[optimize-content] All pages performing well");
    return NextResponse.json({ ok: true, suggestions: 0, reason: "all pages healthy" });
  }

  console.log(`[optimize-content] ${underperforming.length} underperforming pages found, processing up to ${MAX_PAGES_PER_RUN}`);

  // 3. Process up to MAX_PAGES_PER_RUN pages
  const toProcess = underperforming.slice(0, MAX_PAGES_PER_RUN);
  let totalSuggestions = 0;
  const summaryItems: Array<{ businessName: string; suggestionCount: number; topPriority: string }> = [];

  for (const page of toProcess) {
    const content = page.content;
    const businessName = page.business_name ?? "Unknown Business";

    console.log(`[optimize-content] Analyzing ${businessName} (${page.recentLeadCount} leads in 30d)`);

    // Build the content summary for Claude
    const contentSummary = [
      `Business: ${businessName}`,
      `Headline: ${content.headline ?? "(none)"}`,
      `Subheadline: ${content.subheadline ?? "(none)"}`,
      `Body copy: ${content.bodyCopy?.join(" | ") ?? "(none)"}`,
      `CTA text: ${content.ctaText ?? "(none)"}`,
      `Trust elements: ${content.trustElements?.join(", ") ?? "(none)"}`,
      `Form fields: ${content.formFields?.map((f) => `${f.name} (${f.type}, ${f.required ? "required" : "optional"})`).join(", ") ?? "(none)"}`,
      ``,
      `Performance: ${page.recentLeadCount} leads in the last 30 days (underperforming).`,
    ].join("\n");

    let result: ClaudeOptimizationResult;
    try {
      result = await askClaudeJson<ClaudeOptimizationResult>(
        CRO_SYSTEM_PROMPT,
        contentSummary,
        { maxTokens: 1500, temperature: 0.4 },
      );
    } catch (err) {
      console.error(`[optimize-content] Claude error for ${businessName}:`, err instanceof Error ? err.message : err);
      continue;
    }

    if (!result.suggestions || result.suggestions.length === 0) {
      console.log(`[optimize-content] No suggestions returned for ${businessName}`);
      continue;
    }

    // 4. Save suggestions to content_suggestions table
    for (const suggestion of result.suggestions) {
      const { error: insertError } = await supabase
        .from("content_suggestions")
        .insert({
          landing_page_id: page.id,
          session_id: page.session_id,
          suggestion_type: suggestion.type,
          original_text: suggestion.original,
          suggested_text: suggestion.suggested,
          reasoning: suggestion.reasoning,
          status: "pending",
        });

      if (insertError) {
        console.error(`[optimize-content] Insert error for ${businessName}:`, insertError.message);
        continue;
      }
      totalSuggestions++;
    }

    summaryItems.push({
      businessName,
      suggestionCount: result.suggestions.length,
      topPriority: result.topPriority ?? "Review all suggestions",
    });

    console.log(`[optimize-content] Saved ${result.suggestions.length} suggestions for ${businessName} (score: ${result.overallScore}/10)`);
  }

  // 5. Send summary email to rep
  if (totalSuggestions > 0) {
    const tableRows = summaryItems.map((item) =>
      `<tr>
        <td style="padding: 8px 0; font-weight: 600; font-size: 14px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8;">${item.businessName}</td>
        <td style="padding: 8px 0; font-size: 13px; color: #5C6370; border-bottom: 1px solid #E5E1D8;">${item.suggestionCount} suggestion${item.suggestionCount !== 1 ? "s" : ""}</td>
        <td style="padding: 8px 0; font-size: 13px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8;">${item.topPriority}</td>
      </tr>`
    ).join("");

    const htmlBody = emailWrapper(
      `Content Optimization: ${totalSuggestions} Suggestion${totalSuggestions !== 1 ? "s" : ""}`,
      `
        ${emailInfo(`<strong>${totalSuggestions} improvement${totalSuggestions !== 1 ? "s" : ""}</strong> suggested for ${summaryItems.length} underperforming landing page${summaryItems.length !== 1 ? "s" : ""}.`)}
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <th style="text-align: left; padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Client</th>
            <th style="text-align: left; padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Count</th>
            <th style="text-align: left; padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #5C6370; border-bottom: 2px solid #E5E1D8;">Top Priority</th>
          </tr>
          ${tableRows}
        </table>
        ${emailButton("Review Suggestions", `${BASE_URL}/dashboard`)}
      `
    );

    await sendEmailViaResend({
      to: REP_EMAIL,
      subject: `Content optimization: ${totalSuggestions} suggestion${totalSuggestions !== 1 ? "s" : ""} ready to review`,
      body: `${totalSuggestions} content improvement suggestions for ${summaryItems.length} underperforming landing pages. Review them in your dashboard.`,
      htmlBody,
    });

    console.log(`[optimize-content] Summary email sent to ${REP_EMAIL}`);
  }

  console.log(`[optimize-content] Done. ${totalSuggestions} suggestions generated for ${toProcess.length} pages.`);

  return NextResponse.json({
    ok: true,
    suggestions: totalSuggestions,
    pagesAnalyzed: toProcess.length,
    pagesSkipped: underperforming.length - toProcess.length,
  });
}
