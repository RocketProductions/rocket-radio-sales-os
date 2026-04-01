import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendLeadNotification } from "@/lib/smsProviders";
import { triggerAutoResponse } from "@/lib/automation/engine";
import { sendEmailViaResend } from "@/integrations/email";

const Schema = z.object({
  landingPageId: z.string().uuid(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  extraFields: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Save lead
    const { data: lead, error } = await supabase
      .from("lp_leads")
      .insert({
        landing_page_id: body.landingPageId,
        name:            body.name        ?? null,
        phone:           body.phone       ?? null,
        email:           body.email       ?? null,
        extra_fields:    body.extraFields ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Fetch landing page metadata (business_name, tenant_id, slug) for notification
    const { data: page } = await supabase
      .from("landing_pages")
      .select("tenant_id, business_name, slug, lead_count")
      .eq("id", body.landingPageId)
      .single();

    if (page) {
      // Increment lead count
      await supabase
        .from("landing_pages")
        .update({ lead_count: ((page as { lead_count: number }).lead_count ?? 0) + 1 })
        .eq("id", body.landingPageId);

      // Fire SMS notification — fire-and-forget, never blocks the response
      const tenantId     = (page as { tenant_id: string }).tenant_id;
      const businessName = (page as { business_name: string | null }).business_name ?? "the business";
      const slug         = (page as { slug: string }).slug;
      const pageUrl      = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocket-radio-sales-os.vercel.app"}/lp/${slug}`;

      sendLeadNotification(tenantId, {
        name:         body.name,
        phone:        body.phone,
        email:        body.email,
        businessName,
        pageUrl,
        submittedAt:  new Date().toISOString(),
      }).catch((err) => console.error("[leads] SMS notification error:", err));

      // Send email notification to client (business owner)
      sendLeadNotificationEmail(tenantId, {
        leadName:     body.name ?? "Unknown",
        leadPhone:    body.phone ?? "",
        leadEmail:    body.email ?? "",
        businessName,
        extraFields:  body.extraFields ?? {},
      }).catch((err) => console.error("[leads] Email notification error:", err));
    }

    // Fire auto-response (instant text + schedule follow-ups) — fire-and-forget
    triggerAutoResponse((lead as { id: string }).id)
      .catch((err) => console.error("[lp/leads] automation error:", err));

    return NextResponse.json({ ok: true, id: (lead as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

/**
 * Send an email notification to the business owner (client_owner users)
 * when a new lead comes in. Fire-and-forget.
 */
async function sendLeadNotificationEmail(
  tenantId: string,
  data: { leadName: string; leadPhone: string; leadEmail: string; businessName: string; extraFields: Record<string, string> },
) {
  const supabase = getSupabaseAdmin();

  // Find client_owner users for this tenant
  const { data: owners } = await supabase
    .from("app_users")
    .select("email, name")
    .eq("tenant_id", tenantId)
    .eq("role", "client_owner");

  if (!owners || owners.length === 0) return;

  const referral = data.extraFields["How did you hear about us?"];
  const referralLine = referral ? `\nHow they heard about you: ${referral}` : "";
  const contactLine = [data.leadPhone, data.leadEmail].filter(Boolean).join(" | ");

  const subject = `New lead for ${data.businessName}: ${data.leadName}`;
  const body = [
    `Great news! You just got a new lead.`,
    ``,
    `Name: ${data.leadName}`,
    `Contact: ${contactLine || "No contact info provided"}`,
    referralLine,
    ``,
    `We've already sent them an instant response. You can follow up in your dashboard.`,
  ].join("\n");

  const htmlBody = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #1e40af; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">New Lead for ${data.businessName}</h2>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 100px;">Name</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 15px;">${data.leadName}</td>
          </tr>
          ${data.leadPhone ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Phone</td><td style="padding: 8px 0; font-size: 15px;"><a href="tel:${data.leadPhone}" style="color: #1e40af; text-decoration: none;">${data.leadPhone}</a></td></tr>` : ""}
          ${data.leadEmail ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Email</td><td style="padding: 8px 0; font-size: 15px;">${data.leadEmail}</td></tr>` : ""}
          ${referral ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Source</td><td style="padding: 8px 0; font-size: 15px;">${referral}</td></tr>` : ""}
        </table>
        <div style="margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 13px; color: #166534;">
          &#x2713; We already sent them an instant response.
        </div>
        <p style="margin-top: 16px; font-size: 13px; color: #64748b;">
          Check your <strong>Your Leads</strong> dashboard for full details and follow-up options.
        </p>
      </div>
    </div>
  `;

  for (const owner of owners as { email: string; name: string | null }[]) {
    if (!owner.email) continue;
    await sendEmailViaResend({
      to: owner.email,
      subject,
      body,
      htmlBody,
      tenantId,
    });
  }
}
