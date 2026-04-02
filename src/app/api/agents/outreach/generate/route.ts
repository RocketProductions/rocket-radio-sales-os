/**
 * POST /api/agents/outreach/generate
 *
 * AI agent that generates a personalized pitch email for a prospect.
 * Scrapes their website (if available) for context, then uses Claude
 * to write a cold outreach email that feels hand-written.
 *
 * Input: { prospectId: string }
 * Output: { ok: true, email: { id, subject, body, status } }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaudeJson } from "@/lib/claude";
import { scrapeWebsite } from "@/lib/scraper";

const Schema = z.object({
  prospectId: z.string().uuid(),
});

interface GeneratedEmail {
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `You write personalized cold outreach emails for a radio advertising platform called Rocket Radio Sales. Each email should feel like it was written by a real person who actually looked at the prospect's business. Never use 'I hope this email finds you well' or 'I wanted to reach out' — start with a specific observation. Keep it under 150 words. Sign off as the rep's name.

Structure:
- Paragraph 1: Specific observation about their business (from website data)
- Paragraph 2: The problem (advertising without proof of ROI)
- Paragraph 3: The offer (free campaign preview, call to discuss)

Respond with JSON only, no markdown fences:
{ "subject": "string", "body": "string (use \\n for paragraph breaks)" }`;

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // 1. Fetch the prospect
    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", body.prospectId)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json(
        { ok: false, error: "Prospect not found" },
        { status: 404 },
      );
    }

    const p = prospect as {
      id: string;
      tenant_id: string | null;
      business_name: string;
      contact_name: string | null;
      email: string | null;
      phone: string | null;
      website: string | null;
      industry: string | null;
      notes: string | null;
      rep_name: string | null;
    };

    // 2. Scrape website if available
    let websiteContext = "No website available.";
    if (p.website) {
      try {
        const scrapeData = await scrapeWebsite(p.website);
        websiteContext = [
          `Website: ${scrapeData.url}`,
          `Title: ${scrapeData.title}`,
          `Description: ${scrapeData.metaDescription}`,
          `Key headings: ${scrapeData.headings.slice(0, 6).join(", ") || "none"}`,
          `Body excerpt: ${scrapeData.bodyCopyExcerpt.slice(0, 800)}`,
          `Phone on site: ${scrapeData.phone ?? "none found"}`,
          `Social links: ${Object.entries(scrapeData.socialLinks).filter(([, v]) => v).map(([k]) => k).join(", ") || "none found"}`,
        ].join("\n");
      } catch (err) {
        console.warn(`[outreach/generate] Could not scrape ${p.website}:`, err);
        websiteContext = `Website provided (${p.website}) but could not be scraped.`;
      }
    }

    // 3. Build the prompt for Claude
    const repName = p.rep_name ?? "Chris";
    const userMessage = [
      `Prospect business: ${p.business_name}`,
      `Contact name: ${p.contact_name ?? "Business Owner"}`,
      `Industry: ${p.industry ?? "unknown"}`,
      `Notes: ${p.notes ?? "none"}`,
      `Rep name to sign off as: ${repName}`,
      ``,
      `--- Website Context ---`,
      websiteContext,
    ].join("\n");

    // 4. Generate the email via Claude
    const generated = await askClaudeJson<GeneratedEmail>(
      SYSTEM_PROMPT,
      userMessage,
      { maxTokens: 1024, temperature: 0.5 },
    );

    // 5. Save to outreach_emails table
    const { data: email, error: insertError } = await supabase
      .from("outreach_emails")
      .insert({
        prospect_id: p.id,
        tenant_id: p.tenant_id,
        subject: generated.subject,
        body: generated.body,
        status: "draft",
        sequence_step: 1,
        rep_name: repName,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[outreach/generate] Insert error:", insertError);
      throw new Error(insertError.message);
    }

    console.log(
      `[outreach/generate] Draft created for ${p.business_name}: "${generated.subject}"`,
    );

    return NextResponse.json({
      ok: true,
      email: {
        id: (email as { id: string }).id,
        subject: generated.subject,
        body: generated.body,
        status: "draft",
      },
    });
  } catch (err) {
    console.error("[outreach/generate] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
