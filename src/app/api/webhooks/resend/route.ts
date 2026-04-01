/**
 * POST /api/webhooks/resend
 *
 * Receives Resend email events and logs them as lead_events so they
 * show up in the lead activity timeline.
 *
 * Events handled:
 *   email.opened  → "They opened our email: {subject}"
 *   email.clicked → "They clicked a link in our email: {url}"
 *   email.bounced → "Email bounced: {subject}"
 *
 * How lead lookup works:
 *   When an email is sent via sendEmailViaResend(), the Resend message ID
 *   is stored in lead_events.metadata.messageId. We reverse-lookup by
 *   querying for that messageId to find the lead_id.
 *
 * Signature verification:
 *   Resend uses svix. We verify using HMAC-SHA256 without an SDK dependency.
 *   Set RESEND_WEBHOOK_SECRET in Vercel env vars (from Resend dashboard → Webhooks).
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// ── Svix signature verification ───────────────────────────────────────────────

function verifyResendSignature(
  payload: string,
  headers: Headers,
  secret: string,
): boolean {
  try {
    const msgId        = headers.get("svix-id") ?? "";
    const msgTimestamp = headers.get("svix-timestamp") ?? "";
    const msgSignature = headers.get("svix-signature") ?? "";

    if (!msgId || !msgTimestamp || !msgSignature) return false;

    // Reject timestamps older than 5 minutes (replay protection)
    const ts = parseInt(msgTimestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

    // Build signed content
    const signedContent = `${msgId}.${msgTimestamp}.${payload}`;

    // Secret is prefixed "whsec_" then base64 — strip prefix, decode
    const rawSecret = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected  = createHmac("sha256", rawSecret)
      .update(signedContent)
      .digest("base64");

    // svix-signature may contain multiple space-separated "v1,<sig>" entries
    const signatures = msgSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
    return signatures.some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(expected, "base64"));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

// ── Resend event types ────────────────────────────────────────────────────────

interface ResendEvent {
  type: string;
  data: {
    email_id: string;
    subject?: string;
    click?: { link: string };
    bounce?: { message: string };
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const payload   = await req.text();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (webhookSecret) {
    const valid = verifyResendSignature(payload, req.headers, webhookSecret);
    if (!valid) {
      console.error("[resend/webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(payload) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle open, click, bounce
  if (!["email.opened", "email.clicked", "email.bounced"].includes(event.type)) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const emailId = event.data.email_id;
  if (!emailId) return NextResponse.json({ received: true, skipped: true });

  const supabase = getSupabaseAdmin();

  // Find the lead_event that logged this email (contains messageId in metadata)
  const { data: sourceEvent } = await supabase
    .from("lead_events")
    .select("lead_id, message")
    .eq("event_type", "auto_email")
    .filter("metadata->>messageId", "eq", emailId)
    .single();

  if (!sourceEvent) {
    // messageId not found — may be a dev/stub send, or event arrived before we stored it
    console.warn(`[resend/webhook] No lead_event found for messageId: ${emailId}`);
    return NextResponse.json({ received: true, skipped: true });
  }

  const leadId = (sourceEvent as { lead_id: string }).lead_id;

  // Build the activity message
  let eventType: string;
  let message: string;

  if (event.type === "email.opened") {
    eventType = "email_opened";
    message   = `They opened our email`;
    if (event.data.subject) message += `: "${event.data.subject}"`;
  } else if (event.type === "email.clicked") {
    eventType = "email_clicked";
    message   = `They clicked a link in our email`;
    if (event.data.click?.link) message += ` → ${event.data.click.link}`;
  } else {
    eventType = "email_bounced";
    message   = `Email bounced`;
    if (event.data.subject) message += `: "${event.data.subject}"`;
  }

  await supabase.from("lead_events").insert({
    lead_id:    leadId,
    event_type: eventType,
    message,
    metadata:   { email_id: emailId, raw: event.data },
  });

  console.log(`[resend/webhook] ${event.type} for lead ${leadId}`);
  return NextResponse.json({ received: true });
}
