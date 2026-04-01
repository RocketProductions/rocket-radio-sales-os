/**
 * Integration Registry
 *
 * Central registry for all external service integrations.
 * Every integration follows the same pattern:
 *   1. Check environment variables for credentials
 *   2. If present → use the real provider
 *   3. If absent → fall back to a console stub (dev / demo mode)
 *
 * This means the app works end-to-end in dev without any keys,
 * and "just works" in production when keys are added.
 */

export type IntegrationProvider =
  | "email"
  | "sms"
  | "calendar"
  | "apollo"
  | "stripe"
  | "canva"
  | "wix";

export interface IntegrationStatus {
  provider: IntegrationProvider;
  enabled: boolean;
  mode: "live" | "stub";
  label: string;
}

/** Returns the current status of all integrations based on env vars */
export function getIntegrationStatuses(): IntegrationStatus[] {
  return [
    {
      provider: "email",
      enabled: !!process.env.RESEND_API_KEY,
      mode: process.env.RESEND_API_KEY ? "live" : "stub",
      label: "Email (Resend)",
    },
    {
      provider: "sms",
      enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      mode: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? "live" : "stub",
      label: "SMS (Twilio)",
    },
    {
      provider: "calendar",
      enabled: !!process.env.GOOGLE_CALENDAR_CREDENTIALS,
      mode: process.env.GOOGLE_CALENDAR_CREDENTIALS ? "live" : "stub",
      label: "Google Calendar",
    },
    {
      provider: "apollo",
      enabled: !!process.env.APOLLO_API_KEY,
      mode: process.env.APOLLO_API_KEY ? "live" : "stub",
      label: "Apollo.io",
    },
    {
      provider: "stripe",
      enabled: !!process.env.STRIPE_SECRET_KEY,
      mode: process.env.STRIPE_SECRET_KEY ? "live" : "stub",
      label: "Stripe Billing",
    },
    {
      provider: "canva",
      enabled: !!process.env.CANVA_CLIENT_ID,
      mode: process.env.CANVA_CLIENT_ID ? "live" : "stub",
      label: "Canva",
    },
    {
      provider: "wix",
      enabled: !!process.env.WIX_API_KEY,
      mode: process.env.WIX_API_KEY ? "live" : "stub",
      label: "Wix",
    },
  ];
}

/** Log an integration call to the integration_logs table */
export async function logIntegration(params: {
  tenantId?: string;
  provider: IntegrationProvider;
  action: string;
  referenceId?: string;
  referenceType?: string;
  status: "success" | "failed" | "skipped";
  request?: object;
  response?: object;
  errorMessage?: string;
  durationMs?: number;
}): Promise<void> {
  // Only log if we have a DB connection — silently skip if table doesn't exist yet
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const supabase = getSupabaseAdmin();
    await supabase.from("integration_logs").insert({
      tenant_id: params.tenantId ?? "00000000-0000-0000-0000-000000000000",
      provider: params.provider,
      action: params.action,
      reference_id: params.referenceId,
      reference_type: params.referenceType,
      status: params.status,
      request: params.request ? JSON.parse(JSON.stringify(params.request)) : null,
      response: params.response ? JSON.parse(JSON.stringify(params.response)) : null,
      error_message: params.errorMessage,
      duration_ms: params.durationMs,
    });
  } catch {
    // DB not available or table doesn't exist — skip logging
  }
}
