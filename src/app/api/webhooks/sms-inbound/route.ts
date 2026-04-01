/**
 * POST /api/webhooks/sms-inbound
 *
 * Provider-agnostic inbound SMS webhook.
 * Receives a text message (e.g. "ROOF"), matches it to a campaign's
 * sms_keyword in brand_kits, creates a lead, and auto-replies with
 * the landing page URL.
 *
 * Supported providers:
 *   - Twilio:  form-encoded (From, Body, To)
 *   - Sinch:   JSON { from, body, to }
 *   - Generic: JSON { from, body } or query params ?from=&body=
 *
 * Setup:
 *   1. Get a phone number from Twilio/Sinch/etc
 *   2. Set the webhook URL to: https://yourdomain.com/api/webhooks/sms-inbound
 *   3. Add sms_keyword to the brand kit in the campaign wizard
 *   4. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER env vars
 *      (for auto-reply — or leave blank for receive-only mode)
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { triggerAutoResponse } from "@/lib/automation/engine";

interface InboundMessage {
  from: string;
  body: string;
  to?: string;
  provider: "twilio" | "sinch" | "generic";
}

/** Normalize inbound message from any provider format */
async function parseInbound(req: Request): Promise<InboundMessage> {
  const contentType = req.headers.get("content-type") ?? "";
  const url = new URL(req.url);

  // Twilio sends form-encoded
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    return {
      from: (form.get("From") as string) ?? "",
      body: (form.get("Body") as string) ?? "",
      to:   (form.get("To")   as string) ?? "",
      provider: "twilio",
    };
  }

  // JSON body (Sinch, generic)
  if (contentType.includes("application/json")) {
    const json = await req.json() as Record<string, unknown>;
    return {
      from: String(json.from ?? json.From ?? json.msisdn ?? ""),
      body: String(json.body ?? json.Body ?? json.message ?? json.text ?? ""),
      to:   String(json.to ?? json.To ?? ""),
      provider: json.type === "mo_text" ? "sinch" : "generic",
    };
  }

  // Query params fallback
  return {
    from: url.searchParams.get("from") ?? url.searchParams.get("From") ?? "",
    body: url.searchParams.get("body") ?? url.searchParams.get("Body") ?? "",
    to:   url.searchParams.get("to")   ?? "",
    provider: "generic",
  };
}

/** Normalize phone to digits only for matching */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^1(\d{10})$/, "$1");
}

export async function POST(req: Request) {
  try {
    const msg = await parseInbound(req);
    const keyword = msg.body.trim().toUpperCase();
    const fromPhone = normalizePhone(msg.from);

    if (!keyword || !fromPhone) {
      return NextResponse.json({ ok: false, error: "Missing from or body" }, { status: 400 });
    }

    console.log(`[sms-inbound] ${msg.provider}: from=${msg.from} body="${msg.body}"`);

    const supabase = getSupabaseAdmin();

    // Match keyword to a brand kit
    const { data: brandKit } = await supabase
      .from("brand_kits")
      .select("id, business_name, website_url")
      .ilike("sms_keyword", keyword)
      .limit(1)
      .maybeSingle();

    if (!brandKit) {
      console.log(`[sms-inbound] No brand kit matched keyword "${keyword}"`);
      // Return 200 so the provider doesn't retry
      return twimlResponse(msg.provider, "Thanks for your message! Please visit our website for more info.");
    }

    const bk = brandKit as { id: string; business_name: string | null; website_url: string | null };

    // Find the live landing page linked to this brand kit
    const { data: landingPage } = await supabase
      .from("landing_pages")
      .select("id, slug, business_name")
      .eq("brand_kit_id", bk.id)
      .eq("is_live", true)
      .limit(1)
      .maybeSingle();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocket-radio-sales-os.vercel.app";
    const pageUrl = landingPage
      ? `${baseUrl}/lp/${(landingPage as { slug: string }).slug}`
      : bk.website_url ?? baseUrl;

    const businessName = (landingPage as { business_name: string | null } | null)?.business_name
      ?? bk.business_name ?? "us";

    // Create lead in lp_leads
    const { data: lead } = await supabase
      .from("lp_leads")
      .insert({
        landing_page_id: landingPage ? (landingPage as { id: string }).id : null,
        name: null,
        phone: msg.from,
        email: null,
        extra_fields: {
          source: "sms_keyword",
          keyword,
          provider: msg.provider,
          "How did you hear about us?": "Radio ad",
        },
      })
      .select("id")
      .single();

    if (lead) {
      // Fire auto-response sequence
      triggerAutoResponse((lead as { id: string }).id)
        .catch((err) => console.error("[sms-inbound] automation error:", err));
    }

    // Auto-reply with the landing page link
    const replyText = `Thanks for texting ${businessName}! Here's your special offer: ${pageUrl}`;

    // For Twilio: return TwiML so Twilio sends the reply
    if (msg.provider === "twilio") {
      return twimlResponse("twilio", replyText);
    }

    // For other providers: attempt to send reply via our SMS integration
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const { sendSmsViaTwilio } = await import("@/integrations/sms");
      await sendSmsViaTwilio({
        to: msg.from,
        body: replyText,
        leadId: lead ? (lead as { id: string }).id : undefined,
      });
    }

    return NextResponse.json({ ok: true, keyword, matched: bk.business_name });
  } catch (err) {
    console.error("[sms-inbound] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

/** Return TwiML response for Twilio, or JSON for others */
function twimlResponse(provider: string, message: string) {
  if (provider === "twilio") {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
  return NextResponse.json({ ok: true, reply: message });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
