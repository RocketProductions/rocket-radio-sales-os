import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { encryptToken, decryptToken } from "@/lib/crypto";

const SaveSchema = z.object({
  provider: z.enum(["none", "twilio", "simpletexting", "eztext", "webhook"]),
  notifyPhones: z.array(z.string()).default([]),
  notifyEmails: z.array(z.string().email()).default([]),
  isActive: z.boolean().default(false),
  // Credential fields — all optional, only present when provider !== none
  // Twilio
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  // SimpleTexting / shared from-number
  apiKey: z.string().optional(),
  fromNumber: z.string().optional(),
  // EZText
  username: z.string().optional(),
  password: z.string().optional(),
  // Webhook
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  // When true, keep existing encrypted credentials (don't re-encrypt)
  keepExistingCredentials: z.boolean().default(false),
});

// ── GET — load current config (credentials redacted) ─────────────────────────

export async function GET() {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("sms_integrations")
    .select("provider, credentials_encrypted, notify_phones, notify_emails, is_active")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({
      ok: true,
      config: { provider: "none", notifyPhones: [], notifyEmails: [], isActive: false, hasCredentials: false },
    });
  }

  // Decrypt just enough to confirm credentials exist and surface non-secret fields
  const credentialsMeta: Record<string, string> = {};
  if (data.credentials_encrypted) {
    try {
      const raw = JSON.parse(decryptToken(data.credentials_encrypted)) as Record<string, string>;
      // Return masked versions so the UI can show "●●●●●●●● configured"
      if (raw.fromNumber)  credentialsMeta.fromNumber  = raw.fromNumber;
      if (raw.accountSid)  credentialsMeta.accountSidMask  = raw.accountSid.slice(0, 6) + "●●●●●●";
      if (raw.username)    credentialsMeta.username    = raw.username;
      if (raw.webhookUrl)  credentialsMeta.webhookUrl  = raw.webhookUrl;
    } catch { /* ignore decrypt errors on GET */ }
  }

  return NextResponse.json({
    ok: true,
    config: {
      provider: data.provider,
      notifyPhones: data.notify_phones ?? [],
      notifyEmails: data.notify_emails ?? [],
      isActive: data.is_active,
      hasCredentials: !!data.credentials_encrypted,
      ...credentialsMeta,
    },
  });
}

// ── POST — save / update config ───────────────────────────────────────────────

export async function POST(req: Request) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = SaveSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Build encrypted credentials blob
    let credentials_encrypted: string | null = null;

    if (!body.keepExistingCredentials && body.provider !== "none") {
      let creds: Record<string, string> = {};

      if (body.provider === "twilio") {
        creds = {
          accountSid: body.accountSid ?? "",
          authToken:  body.authToken  ?? "",
          fromNumber: body.fromNumber ?? "",
        };
      } else if (body.provider === "simpletexting") {
        creds = {
          apiKey:     body.apiKey     ?? "",
          fromNumber: body.fromNumber ?? "",
        };
      } else if (body.provider === "eztext") {
        creds = {
          username:   body.username   ?? "",
          password:   body.password   ?? "",
          fromNumber: body.fromNumber ?? "",
        };
      } else if (body.provider === "webhook") {
        creds = {
          url:          body.webhookUrl    ?? "",
          secretHeader: body.webhookSecret ?? "",
        };
      }

      credentials_encrypted = encryptToken(JSON.stringify(creds));
    } else if (body.keepExistingCredentials) {
      // Fetch existing encrypted blob — keep it unchanged
      const { data: existing } = await supabase
        .from("sms_integrations")
        .select("credentials_encrypted")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      credentials_encrypted = existing?.credentials_encrypted ?? null;
    }

    const { error } = await supabase
      .from("sms_integrations")
      .upsert(
        {
          tenant_id:             tenantId,
          provider:              body.provider,
          credentials_encrypted,
          notify_phones:         body.notifyPhones,
          notify_emails:         body.notifyEmails,
          is_active:             body.isActive,
        },
        { onConflict: "tenant_id" }
      );

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
