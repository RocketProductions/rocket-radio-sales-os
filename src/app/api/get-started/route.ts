/**
 * POST /api/get-started
 *
 * Rocket Radio's own lead capture — a business owner interested in
 * our service fills out the form on /get-started.
 *
 * This creates a prospect record and notifies the sales rep via
 * SMS and email so they can follow up with a campaign preview.
 *
 * This is NOT a client campaign lead — it's a lead for Federated Media.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendSmsViaTwilio } from "@/integrations/sms";
import { sendEmailViaResend } from "@/integrations/email";

const Schema = z.object({
  businessName: z.string().min(1),
  website:      z.string().optional(),
  phone:        z.string().optional(),
  contactName:  z.string().optional(),
  email:        z.string().email().optional().or(z.literal("")),
  referral:     z.string().optional(),
});

// Rep notification targets — add more as your team grows
const REP_PHONE = process.env.REP_NOTIFICATION_PHONE ?? "";
const REP_EMAIL = process.env.REP_NOTIFICATION_EMAIL ?? "christopher.alumbaugh@gmail.com";

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Store as a prospect in a dedicated table (or lp_leads with no landing_page_id)
    const { data: lead, error } = await supabase
      .from("lp_leads")
      .insert({
        landing_page_id: null,
        name:            body.contactName ?? body.businessName,
        phone:           body.phone ?? null,
        email:           body.email || null,
        extra_fields: {
          source:         "get-started",
          businessName:   body.businessName,
          website:        body.website ?? "",
          "How did you hear about us?": body.referral ?? "",
        },
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const leadId = (lead as { id: string }).id;
    const contact = [body.contactName, body.phone, body.email].filter(Boolean).join(" | ");

    // ── Notify rep via SMS ──────────────────────────────────────────
    if (REP_PHONE) {
      sendSmsViaTwilio({
        to: REP_PHONE,
        body: `New prospect! ${body.businessName}${body.website ? ` (${body.website})` : ""}. Contact: ${contact || "no info"}. Source: ${body.referral || "unknown"}. Open the campaign wizard and build their preview.`,
        leadId,
      }).catch((err) => console.error("[get-started] SMS notify error:", err));
    }

    // ── Notify rep via email ────────────────────────────────────────
    if (REP_EMAIL) {
      const htmlBody = `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #1e40af; padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 18px;">New Prospect from Get Started</h2>
          </div>
          <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Business</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 15px;">${body.businessName}</td>
              </tr>
              ${body.website ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Website</td><td style="padding: 8px 0; font-size: 14px;"><a href="${body.website}" style="color: #1e40af;">${body.website}</a></td></tr>` : ""}
              ${body.contactName ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Contact</td><td style="padding: 8px 0; font-size: 14px;">${body.contactName}</td></tr>` : ""}
              ${body.phone ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Phone</td><td style="padding: 8px 0; font-size: 14px;"><a href="tel:${body.phone}" style="color: #1e40af;">${body.phone}</a></td></tr>` : ""}
              ${body.email ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Email</td><td style="padding: 8px 0; font-size: 14px;">${body.email}</td></tr>` : ""}
              ${body.referral ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Source</td><td style="padding: 8px 0; font-size: 14px;">${body.referral}</td></tr>` : ""}
            </table>
            <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border-radius: 8px; font-size: 13px; color: #1e40af;">
              <strong>Next step:</strong> Open the campaign wizard, paste their website URL, and build a proposal. Call them within 24 hours.
            </div>
          </div>
        </div>
      `;

      sendEmailViaResend({
        to: REP_EMAIL,
        subject: `New prospect: ${body.businessName}`,
        body: `New prospect from Get Started page.\n\nBusiness: ${body.businessName}\nWebsite: ${body.website ?? "none"}\nContact: ${contact}\nSource: ${body.referral ?? "unknown"}\n\nNext step: Open the campaign wizard, paste their website, build a proposal.`,
        htmlBody,
      }).catch((err) => console.error("[get-started] Email notify error:", err));
    }

    // ── Auto-reply to prospect ──────────────────────────────────────
    if (body.phone) {
      sendSmsViaTwilio({
        to: body.phone,
        body: `Thanks for your interest in Rocket Radio, ${body.contactName ?? body.businessName}! A Federated Media strategist will reach out within 24 hours with a custom campaign preview. We're already working on it!`,
        leadId,
      }).catch((err) => console.error("[get-started] Auto-reply error:", err));
    }

    return NextResponse.json({ ok: true, id: leadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
