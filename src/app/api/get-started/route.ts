/**
 * POST /api/get-started
 *
 * Rocket Radio's own lead capture — a business owner interested in
 * our service fills out the form on /get-started.
 *
 * Creates a prospect record and fires 3 notifications:
 * 1. SMS to sales rep
 * 2. Branded email to sales rep with "Build Their Campaign →" CTA
 * 3. Branded confirmation email to the prospect
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendSmsViaTwilio } from "@/integrations/sms";
import { sendEmailViaResend } from "@/integrations/email";
import { emailWrapper, emailButton, emailRow, emailPhone, emailInfo } from "@/lib/emailTemplate";

const Schema = z.object({
  businessName: z.string().min(1),
  website:      z.string().optional(),
  phone:        z.string().optional(),
  contactName:  z.string().optional(),
  email:        z.string().email().optional().or(z.literal("")),
  referral:     z.string().optional(),
});

const REP_PHONE = process.env.REP_NOTIFICATION_PHONE ?? "";
const REP_EMAIL = process.env.REP_NOTIFICATION_EMAIL ?? "christopher.alumbaugh@gmail.com";
const BASE_URL  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

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
    const wizardUrl = `${BASE_URL}/dashboard/campaigns/new${body.website ? `?website=${encodeURIComponent(body.website)}` : ""}`;

    // ── 1. SMS to rep ──────────────────────────────────────────────
    if (REP_PHONE) {
      sendSmsViaTwilio({
        to: REP_PHONE,
        body: `🚀 New prospect! ${body.businessName}${body.website ? ` (${body.website})` : ""}. Contact: ${contact || "no info"}. Source: ${body.referral || "unknown"}.`,
        leadId,
      }).catch((err) => console.error("[get-started] SMS notify error:", err));
    }

    // ── 2. Branded email to rep ────────────────────────────────────
    if (REP_EMAIL) {
      const rows = [
        emailRow("Business", body.businessName),
        body.website ? emailRow("Website", body.website, true) : "",
        body.contactName ? emailRow("Contact", body.contactName) : "",
        body.phone ? emailPhone("Phone", body.phone) : "",
        body.email ? emailRow("Email", body.email) : "",
        body.referral ? emailRow("Source", body.referral) : "",
      ].filter(Boolean).join("");

      const repHtml = emailWrapper(
        `New Prospect: ${body.businessName}`,
        `
          <table style="width: 100%; border-collapse: collapse;">${rows}</table>
          ${emailButton("Build Their Campaign", wizardUrl)}
          ${emailInfo("<strong>Next step:</strong> Open the campaign wizard, paste their website, and build a proposal. Call them within 24 hours.")}
        `
      );

      sendEmailViaResend({
        to: REP_EMAIL,
        subject: `🚀 New prospect: ${body.businessName}`,
        body: `New prospect: ${body.businessName}\nWebsite: ${body.website ?? "none"}\nContact: ${contact}\nSource: ${body.referral ?? "unknown"}\n\nBuild their campaign: ${wizardUrl}`,
        htmlBody: repHtml,
      }).catch((err) => console.error("[get-started] Rep email error:", err));
    }

    // ── 3. Confirmation email to prospect ──────────────────────────
    if (body.email) {
      const firstName = body.contactName?.split(" ")[0] ?? "there";
      const prospectHtml = emailWrapper(
        `We're Building Your Campaign Preview`,
        `
          <p style="font-size: 15px; color: #0B1D3A; margin: 0 0 16px;">
            Hi ${firstName},
          </p>
          <p style="font-size: 14px; color: #5C6370; line-height: 1.6; margin: 0 0 24px;">
            Thanks for your interest in Rocket Radio. A Federated Media strategist
            is already working on a custom campaign preview for <strong style="color: #0B1D3A;">${body.businessName}</strong>.
          </p>

          <p style="font-size: 13px; font-weight: 700; color: #0B1D3A; margin: 0 0 12px;">Here's what happens next:</p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; vertical-align: top; width: 32px;">
                <div style="width: 24px; height: 24px; background: #D4A853; border-radius: 50%; color: #0B1D3A; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px;">1</div>
              </td>
              <td style="padding: 10px 0; padding-left: 12px;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0B1D3A;">We analyze your website</p>
                <p style="margin: 2px 0 0; font-size: 12px; color: #5C6370;">Already in progress</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <div style="width: 24px; height: 24px; background: #D4A853; border-radius: 50%; color: #0B1D3A; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px;">2</div>
              </td>
              <td style="padding: 10px 0; padding-left: 12px;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0B1D3A;">We build your campaign preview</p>
                <p style="margin: 2px 0 0; font-size: 12px; color: #5C6370;">Radio script, landing page, and ROI projection</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <div style="width: 24px; height: 24px; background: #D4A853; border-radius: 50%; color: #0B1D3A; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px;">3</div>
              </td>
              <td style="padding: 10px 0; padding-left: 12px;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0B1D3A;">A strategist calls you</p>
                <p style="margin: 2px 0 0; font-size: 12px; color: #5C6370;">Within 24 hours to walk you through everything</p>
              </td>
            </tr>
          </table>

          <div style="margin-top: 24px; padding: 16px; background: #F5F3EF; border-radius: 10px; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #5C6370;">Questions? Call us anytime</p>
            <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: #0B1D3A;">
              <a href="tel:2604475511" style="color: #0B1D3A; text-decoration: none;">(260) 447-5511</a>
            </p>
          </div>
        `
      );

      sendEmailViaResend({
        to: body.email,
        subject: `We're building your campaign preview — Rocket Radio`,
        body: `Hi ${firstName},\n\nThanks for your interest in Rocket Radio. A strategist is already building a custom campaign preview for ${body.businessName}.\n\nHere's what happens next:\n1. We analyze your website\n2. We build your radio script, landing page, and ROI projection\n3. A strategist calls you within 24 hours\n\nQuestions? Call (260) 447-5511`,
        htmlBody: prospectHtml,
      }).catch((err) => console.error("[get-started] Prospect email error:", err));
    }

    // ── 4. Auto-reply SMS to prospect ──────────────────────────────
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
