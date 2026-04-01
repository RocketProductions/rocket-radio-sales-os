import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { triggerAutoResponse } from "@/lib/automation/engine";

/**
 * Meta Lead Ads Webhook
 *
 * GET  — Webhook verification (Meta sends a challenge)
 * POST — Lead data from Meta Lead Ads
 *
 * Meta sends leads in this format:
 * { entry: [{ changes: [{ value: { leadgen_id, form_id, field_data: [...] } }] }] }
 *
 * Leads are stored in lp_leads (landing_page_id = null, source in extra_fields).
 */

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "rocket-verify-token";

/** GET — Meta webhook verification */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

interface MetaFieldData {
  name: string;
  values: string[];
}

/** POST — Receive lead from Meta */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    // Extract leads from Meta webhook payload
    const entries = body?.entry ?? [];
    let leadsCreated = 0;

    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const fieldData: MetaFieldData[] = change?.value?.field_data ?? [];
        const formId: string = change?.value?.form_id ?? "";
        const leadgenId: string = change?.value?.leadgen_id ?? "";

        const fields: Record<string, string> = {};
        let firstName = "";
        let lastName = "";
        let email = "";
        let phone = "";

        for (const field of fieldData) {
          const value = field.values?.[0] ?? "";
          const key = field.name?.toLowerCase();
          fields[key] = value;
          if (key === "first_name" || key === "full_name") firstName = value;
          if (key === "last_name") lastName = value;
          if (key === "email") email = value;
          if (key === "phone_number" || key === "phone") phone = value;
        }

        const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

        const { data: lead, error } = await supabase
          .from("lp_leads")
          .insert({
            landing_page_id: null,
            name: fullName,
            email: email || null,
            phone: phone || null,
            status: "new",
            extra_fields: {
              source: "meta_lead_ad",
              form_id: formId,
              leadgen_id: leadgenId,
              ...fields,
            },
          })
          .select("id")
          .single();

        if (error) {
          console.error("[meta-leads] Insert error:", error.message);
          continue;
        }

        const leadId = (lead as { id: string }).id;

        // Log creation event
        await supabase.from("lead_events").insert({
          lead_id: leadId,
          event_type: "lead_created",
          message: `New lead from Meta Lead Ad: ${fullName ?? "Unknown"}`,
          metadata: { source: "meta_lead_ad", form_id: formId },
        });

        // Fire auto-response — fire-and-forget
        triggerAutoResponse(leadId).catch((err) =>
          console.error("[meta-leads] Auto-response error:", err)
        );

        leadsCreated++;
      }
    }

    return NextResponse.json({ ok: true, leadsCreated });
  } catch (err) {
    console.error("Meta webhook error:", err);
    return NextResponse.json({ ok: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
