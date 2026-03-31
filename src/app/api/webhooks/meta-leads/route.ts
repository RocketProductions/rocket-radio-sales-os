import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAutoResponse } from "@/lib/automation/engine";

/**
 * Meta Lead Ads Webhook
 *
 * GET  — Webhook verification (Meta sends a challenge)
 * POST — Lead data from Meta Lead Ads
 *
 * Meta sends leads in this format:
 * { entry: [{ changes: [{ value: { leadgen_id, form_id, field_data: [...] } }] }] }
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

    // Extract leads from Meta webhook payload
    const entries = body?.entry ?? [];
    const leads: Array<{
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    }> = [];

    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const fieldData: MetaFieldData[] = change?.value?.field_data ?? [];
        const lead: Record<string, string> = {};

        for (const field of fieldData) {
          const value = field.values?.[0] ?? "";
          const name = field.name?.toLowerCase();
          if (name === "first_name" || name === "full_name") lead.firstName = value;
          if (name === "last_name") lead.lastName = value;
          if (name === "email") lead.email = value;
          if (name === "phone_number" || name === "phone") lead.phone = value;
        }

        leads.push(lead);
      }
    }

    // Find a default campaign to attach leads to
    // In production, this would map form_id → campaign via a config table
    const defaultCampaign = await prisma.campaign.findFirst({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    });

    if (!defaultCampaign) {
      console.warn("Meta webhook received but no active campaign found");
      return NextResponse.json({ ok: true, message: "No active campaign" });
    }

    // Create leads
    for (const leadData of leads) {
      const lead = await prisma.lead.create({
        data: {
          campaignId: defaultCampaign.id,
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          email: leadData.email,
          phone: leadData.phone,
          source: "meta_lead_ad",
          status: "new",
        },
      });

      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          eventType: "lead_created",
          message: `New lead from Meta Lead Ad: ${[leadData.firstName, leadData.lastName].filter(Boolean).join(" ") || "Unknown"}`,
        },
      });

      // Trigger auto-response
      triggerAutoResponse(lead.id).catch(console.error);
    }

    return NextResponse.json({ ok: true, leadsCreated: leads.length });
  } catch (err) {
    console.error("Meta webhook error:", err);
    return NextResponse.json({ ok: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
