/**
 * Email Integration — Resend
 *
 * Sends transactional emails to leads.
 * Used by the auto-response engine and nurture sequences.
 *
 * Requires env:
 *   RESEND_API_KEY=re_...
 *   EMAIL_FROM=leads@rocketradiosales.com (optional, defaults shown below)
 *
 * In dev/demo with no key: logs to console only.
 */

import { logIntegration } from "./registry";

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;          // Plain text body
  htmlBody?: string;     // Optional HTML version
  leadId?: string;
  tenantId?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: "live" | "stub";
}

const FROM_EMAIL = process.env.EMAIL_FROM ?? "leads@rocketradiosales.com";
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? "Rocket Radio";

/** Send an email using Resend (or stub in dev) */
export async function sendEmailViaResend(params: SendEmailParams): Promise<EmailResult> {
  const start = Date.now();

  if (!process.env.RESEND_API_KEY) {
    // Stub mode — log to console, don't fail
    console.log(`[EMAIL STUB] To: ${params.to}`);
    console.log(`[EMAIL STUB] Subject: ${params.subject}`);
    console.log(`[EMAIL STUB] Body: ${params.body.slice(0, 100)}...`);

    await logIntegration({
      tenantId: params.tenantId,
      provider: "email",
      action: "send_email",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "skipped",
      request: { to: params.to, subject: params.subject },
      durationMs: Date.now() - start,
    });

    return { success: true, mode: "stub" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [params.to],
        subject: params.subject,
        text: params.body,
        html: params.htmlBody ?? `<p>${params.body.replace(/\n/g, "<br>")}</p>`,
      }),
    });

    const data = await res.json() as { id?: string; name?: string; message?: string };

    if (!res.ok) {
      const error = data.message ?? data.name ?? "Unknown Resend error";
      await logIntegration({
        tenantId: params.tenantId,
        provider: "email",
        action: "send_email",
        referenceId: params.leadId,
        referenceType: "lead",
        status: "failed",
        request: { to: params.to, subject: params.subject },
        errorMessage: error,
        durationMs: Date.now() - start,
      });
      return { success: false, error, mode: "live" };
    }

    await logIntegration({
      tenantId: params.tenantId,
      provider: "email",
      action: "send_email",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "success",
      request: { to: params.to, subject: params.subject },
      response: { id: data.id },
      durationMs: Date.now() - start,
    });

    return { success: true, messageId: data.id, mode: "live" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Network error";
    await logIntegration({
      tenantId: params.tenantId,
      provider: "email",
      action: "send_email",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "failed",
      errorMessage: error,
      durationMs: Date.now() - start,
    });
    return { success: false, error, mode: "live" };
  }
}
