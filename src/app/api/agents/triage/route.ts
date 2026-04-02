/**
 * POST /api/agents/triage
 *
 * AI agent that scores incoming get-started prospects.
 * Fire-and-forget from the get-started API after lead is saved.
 *
 * Claude analyzes the prospect's website (if provided) and business info,
 * then scores them 1-10 with reasoning and priority level.
 *
 * Protected by CRON_SECRET bearer token (same as cron endpoints).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { askClaudeJson } from "@/lib/claude";
import { sendSmsViaTwilio } from "@/integrations/sms";

const Schema = z.object({
  leadId: z.string().uuid(),
});

interface TriageResult {
  score: number;        // 1-10
  priority: "hot" | "warm" | "cold";
  reasoning: string;    // 1-2 sentence explanation
  suggestedAction: string; // what the rep should do
}

const REP_PHONE = process.env.REP_NOTIFICATION_PHONE ?? "";

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Fetch the lead
    const { data: lead } = await supabase
      .from("lp_leads")
      .select("id, name, phone, email, extra_fields")
      .eq("id", body.leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    const l = lead as { id: string; name: string | null; phone: string | null; email: string | null; extra_fields: Record<string, string> | null };
    const businessName = l.extra_fields?.businessName ?? l.name ?? "Unknown";
    const website = l.extra_fields?.website ?? "";
    const referral = l.extra_fields?.["How did you hear about us?"] ?? "";

    // Lightweight website analysis if URL provided
    let websiteContext = "No website provided.";
    if (website) {
      try {
        const url = website.startsWith("http") ? website : `https://${website}`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; RocketRadioBot/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        const html = await res.text();

        const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
        const hasPhone = /href=["']tel:/i.test(html);
        const hasSocial = /facebook\.com\/|instagram\.com\/|yelp\.com\/biz/i.test(html);
        const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
          .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
          .filter((h) => h.length > 2)
          .slice(0, 5);

        websiteContext = [
          `Website: ${website}`,
          `Title: ${title}`,
          `Has phone on site: ${hasPhone ? "yes" : "no"}`,
          `Has social links: ${hasSocial ? "yes" : "no"}`,
          `Key headings: ${headings.join(", ") || "none found"}`,
          `Page size: ${(html.length / 1024).toFixed(0)}KB`,
        ].join("\n");
      } catch {
        websiteContext = `Website provided (${website}) but could not be reached.`;
      }
    }

    // Claude triage
    const triageData = [
      `Business: ${businessName}`,
      `Contact: ${l.name ?? "not provided"}`,
      `Phone: ${l.phone ?? "not provided"}`,
      `Email: ${l.email ?? "not provided"}`,
      `Referral: ${referral || "not specified"}`,
      ``,
      websiteContext,
    ].join("\n");

    const result = await askClaudeJson<TriageResult>(
      `You are a lead scoring agent for Rocket Radio Sales, a radio advertising platform. Score incoming business prospects based on how likely they are to become a paying client.

Scoring criteria:
- Has a real website with services listed: +2
- Has a phone number on their site: +1
- Has social media presence: +1
- Is a service business (HVAC, roofing, dental, auto, restaurants): +2
- Heard about us from radio: +1
- Provided both phone and email: +1
- Website looks professional/established: +1
- Clear local service area: +1

Priority levels:
- 8-10: "hot" — call within 1 hour
- 5-7: "warm" — call within 24 hours
- 1-4: "cold" — add to nurture sequence

Respond with JSON only, no markdown fences:
{ "score": number, "priority": "hot"|"warm"|"cold", "reasoning": "1-2 sentences", "suggestedAction": "what the rep should do" }`,
      triageData,
      { maxTokens: 512, temperature: 0.2 },
    );

    // Update lead with triage data
    await supabase
      .from("lp_leads")
      .update({
        triage_score: result.score,
        triage_priority: result.priority,
        triage_notes: `${result.reasoning}\n\nSuggested: ${result.suggestedAction}`,
      })
      .eq("id", body.leadId);

    // If hot prospect, send urgent SMS to rep
    if (result.priority === "hot" && REP_PHONE) {
      sendSmsViaTwilio({
        to: REP_PHONE,
        body: `🔥 HOT prospect (${result.score}/10): ${businessName}${website ? ` — ${website}` : ""}. ${result.suggestedAction}`,
        leadId: body.leadId,
      }).catch((err) => console.error("[triage] SMS error:", err));
    }

    console.log(`[triage] ${businessName}: ${result.score}/10 (${result.priority}) — ${result.reasoning}`);

    return NextResponse.json({ ok: true, score: result.score, priority: result.priority });
  } catch (err) {
    console.error("[triage] Error:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
