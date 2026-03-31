/**
 * SMS Integration — Twilio
 *
 * Sends text messages to leads for instant auto-response and follow-up.
 * This is the most important integration — the "we text your leads instantly" promise.
 *
 * Requires env:
 *   TWILIO_ACCOUNT_SID=ACxxxx
 *   TWILIO_AUTH_TOKEN=xxxx
 *   TWILIO_FROM_NUMBER=+1xxxxxxxxxx
 *
 * In dev/demo with no credentials: logs to console only (stub mode).
 */

import { logIntegration } from "./registry";

export interface SendSmsParams {
  to: string;       // E.164 format: +1xxxxxxxxxx
  body: string;     // Message text (keep under 160 chars for single segment)
  leadId?: string;
  tenantId?: string;
}

export interface SmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  mode: "live" | "stub";
}

/** Normalize phone number to E.164 format */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone; // Return as-is if already formatted or unrecognized
}

/** Send an SMS using Twilio (or stub in dev) */
export async function sendSmsViaTwilio(params: SendSmsParams): Promise<SmsResult> {
  const start = Date.now();
  const toNumber = normalizePhone(params.to);

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    // Stub mode
    console.log(`[SMS STUB] To: ${toNumber}`);
    console.log(`[SMS STUB] Body: ${params.body}`);

    await logIntegration({
      tenantId: params.tenantId,
      provider: "sms",
      action: "send_sms",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "skipped",
      request: { to: toNumber, bodyLength: params.body.length },
      durationMs: Date.now() - start,
    });

    return { success: true, mode: "stub" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER ?? "";

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  try {
    const body = new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Body: params.body,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json() as { sid?: string; message?: string; code?: number };

    if (!res.ok) {
      const error = data.message ?? `Twilio error ${res.status}`;
      await logIntegration({
        tenantId: params.tenantId,
        provider: "sms",
        action: "send_sms",
        referenceId: params.leadId,
        referenceType: "lead",
        status: "failed",
        request: { to: toNumber },
        errorMessage: error,
        durationMs: Date.now() - start,
      });
      return { success: false, error, mode: "live" };
    }

    await logIntegration({
      tenantId: params.tenantId,
      provider: "sms",
      action: "send_sms",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "success",
      request: { to: toNumber },
      response: { sid: data.sid },
      durationMs: Date.now() - start,
    });

    return { success: true, messageSid: data.sid, mode: "live" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Network error";
    await logIntegration({
      tenantId: params.tenantId,
      provider: "sms",
      action: "send_sms",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "failed",
      errorMessage: error,
      durationMs: Date.now() - start,
    });
    return { success: false, error, mode: "live" };
  }
}
