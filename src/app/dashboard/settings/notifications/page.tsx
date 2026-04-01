import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptToken } from "@/lib/crypto";
import { SmsNotificationsManager } from "@/components/settings/SmsNotificationsManager";

interface SmsRow {
  provider: string;
  credentials_encrypted: string | null;
  notify_phones: string[];
  notify_emails: string[];
  is_active: boolean;
}

interface SmsConfigResult {
  provider: string;
  notifyPhones: string[];
  notifyEmails: string[];
  isActive: boolean;
  hasCredentials: boolean;
  fromNumber?: string;
  accountSidMask?: string;
  username?: string;
  webhookUrl?: string;
}

async function loadSmsConfig(tenantId: string): Promise<SmsConfigResult> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("sms_integrations")
      .select("provider, credentials_encrypted, notify_phones, notify_emails, is_active")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!data) return { provider: "none", notifyPhones: [], notifyEmails: [], isActive: false, hasCredentials: false };

    const row = data as SmsRow;
    const result: SmsConfigResult = {
      provider:       row.provider,
      notifyPhones:   row.notify_phones  ?? [],
      notifyEmails:   row.notify_emails  ?? [],
      isActive:       row.is_active,
      hasCredentials: !!row.credentials_encrypted,
    };

    if (row.credentials_encrypted) {
      try {
        const raw = JSON.parse(decryptToken(row.credentials_encrypted)) as Record<string, string>;
        if (raw.fromNumber)  result.fromNumber     = raw.fromNumber;
        if (raw.accountSid)  result.accountSidMask = raw.accountSid.slice(0, 6) + "●●●●●●";
        if (raw.username)    result.username        = raw.username;
        if (raw.url)         result.webhookUrl      = raw.url;
      } catch { /* ignore */ }
    }

    return result;
  } catch {
    return { provider: "none", notifyPhones: [], notifyEmails: [], isActive: false, hasCredentials: false };
  }
}

export default async function NotificationsPage() {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id") ?? "default";
  const config = await loadSmsConfig(tenantId);

  return (
    <SmsNotificationsManager
      initial={{
        provider:       config.provider as "none" | "twilio" | "simpletexting" | "eztext" | "webhook",
        notifyPhones:   config.notifyPhones,
        notifyEmails:   config.notifyEmails,
        isActive:       config.isActive,
        hasCredentials: config.hasCredentials,
        fromNumber:     config.fromNumber,
        accountSidMask: config.accountSidMask,
        username:       config.username,
        webhookUrl:     config.webhookUrl,
      }}
    />
  );
}
