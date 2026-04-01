/**
 * Pluggable SMS notification layer.
 * Reads the tenant's sms_integrations row, decrypts credentials,
 * and dispatches to the correct provider at lead-submit time.
 *
 * Supported providers:
 *  - twilio       — REST API (Account SID + Auth Token + From Number)
 *  - simpletexting — REST API (API Key + From Number)
 *  - eztext       — REST API (Username + Password + From Number)
 *  - webhook      — HTTP POST JSON to any URL (Zapier, Make, Podium, etc.)
 *  - none         — disabled
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptToken } from "@/lib/crypto";

export type SmsProvider = "none" | "twilio" | "simpletexting" | "eztext" | "webhook";

// ── Credential shapes per provider ──────────────────────────────────────────

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface SimpleTextingCredentials {
  apiKey: string;
  fromNumber: string;
}

interface EzTextCredentials {
  username: string;
  password: string;
  fromNumber: string;
}

interface WebhookCredentials {
  url: string;
  secretHeader?: string; // optional: sent as X-Webhook-Secret
}

type AnyCredentials =
  | TwilioCredentials
  | SimpleTextingCredentials
  | EzTextCredentials
  | WebhookCredentials;

// ── Lead payload passed to each sender ──────────────────────────────────────

export interface LeadPayload {
  name?: string;
  phone?: string;
  email?: string;
  businessName: string;
  pageUrl: string;
  submittedAt: string;
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Fires-and-forgets a lead notification for the given tenant.
 * Errors are caught and logged — never throws so the lead save is unaffected.
 */
export async function sendLeadNotification(
  tenantId: string,
  lead: LeadPayload
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sms_integrations")
      .select("provider, credentials_encrypted, notify_phones, notify_emails, is_active")
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data || !data.is_active || data.provider === "none") return;

    const provider = data.provider as SmsProvider;
    const notifyPhones: string[] = data.notify_phones ?? [];

    if (notifyPhones.length === 0 && provider !== "webhook") return;

    let credentials: AnyCredentials | null = null;
    if (data.credentials_encrypted) {
      try {
        credentials = JSON.parse(decryptToken(data.credentials_encrypted)) as AnyCredentials;
      } catch {
        console.error("[smsProviders] Failed to decrypt credentials for tenant", tenantId);
        return;
      }
    }

    const message = buildMessage(lead);

    switch (provider) {
      case "twilio":
        await sendViaTwilio(credentials as TwilioCredentials, notifyPhones, message);
        break;
      case "simpletexting":
        await sendViaSimpleTexting(credentials as SimpleTextingCredentials, notifyPhones, message);
        break;
      case "eztext":
        await sendViaEzText(credentials as EzTextCredentials, notifyPhones, message);
        break;
      case "webhook":
        await sendViaWebhook(credentials as WebhookCredentials, lead);
        break;
    }
  } catch (err) {
    console.error("[smsProviders] Notification error:", err);
  }
}

// ── Message builder ──────────────────────────────────────────────────────────

function buildMessage(lead: LeadPayload): string {
  const parts = [`🔔 New lead for ${lead.businessName}!`];
  if (lead.name)  parts.push(`Name: ${lead.name}`);
  if (lead.phone) parts.push(`Phone: ${lead.phone}`);
  if (lead.email) parts.push(`Email: ${lead.email}`);
  parts.push(`Page: ${lead.pageUrl}`);
  return parts.join("\n");
}

// ── Twilio ───────────────────────────────────────────────────────────────────

async function sendViaTwilio(
  creds: TwilioCredentials,
  toNumbers: string[],
  body: string
): Promise<void> {
  const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");
  await Promise.allSettled(
    toNumbers.map((to) =>
      fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ From: creds.fromNumber, To: to, Body: body }),
        }
      )
    )
  );
}

// ── SimpleTexting ────────────────────────────────────────────────────────────

async function sendViaSimpleTexting(
  creds: SimpleTextingCredentials,
  toNumbers: string[],
  body: string
): Promise<void> {
  await Promise.allSettled(
    toNumbers.map((to) =>
      fetch("https://api-app2.simpletexting.com/v2/api/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contactPhone: to, text: body, from: creds.fromNumber }),
      })
    )
  );
}

// ── EZTexting ────────────────────────────────────────────────────────────────

async function sendViaEzText(
  creds: EzTextCredentials,
  toNumbers: string[],
  body: string
): Promise<void> {
  const auth = Buffer.from(`${creds.username}:${creds.password}`).toString("base64");
  await Promise.allSettled(
    toNumbers.map((to) =>
      fetch("https://app.eztexting.com/v1/sending/messages", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: creds.fromNumber,
          recipients: [{ phone: to }],
          body,
        }),
      })
    )
  );
}

// ── Generic Webhook ──────────────────────────────────────────────────────────

async function sendViaWebhook(
  creds: WebhookCredentials,
  lead: LeadPayload
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (creds.secretHeader) headers["X-Webhook-Secret"] = creds.secretHeader;

  await fetch(creds.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "lead.submitted",
      ...lead,
    }),
  });
}
