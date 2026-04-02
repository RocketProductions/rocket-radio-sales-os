/**
 * GET /api/cron/review-request
 *
 * Review & Referral Engine — runs daily.
 *
 * Two stages:
 *   1. 7-8 days after close: send a Google review request text
 *   2. 30-31 days after close: send a referral request text
 *
 * Capped at 20 texts per run total.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendSmsViaTwilio } from "@/integrations/sms";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 20;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  // Window boundaries
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const eightDaysAgo = new Date(now.getTime() - 8 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 86400000);

  let totalSent = 0;
  let reviewsSent = 0;
  let referralsSent = 0;
  const errors: string[] = [];

  try {
    // ── Stage 1: Review requests (7-8 days after close) ──────────────
    const { data: reviewLeads, error: reviewError } = await supabase
      .from("lp_leads")
      .select(`
        id, first_name, phone, landing_page_id,
        landing_pages ( business_name, slug )
      `)
      .eq("status", "closed")
      .gte("updated_at", eightDaysAgo.toISOString())
      .lte("updated_at", sevenDaysAgo.toISOString())
      .limit(MAX_PER_RUN);

    if (reviewError) {
      console.error("[review-request] Review query error:", reviewError);
      errors.push(reviewError.message);
    }

    if (reviewLeads && reviewLeads.length > 0) {
      // Filter out leads that already received a review request
      const reviewLeadIds = reviewLeads.map((l: { id: string }) => l.id);
      const { data: existingReviews } = await supabase
        .from("lead_events")
        .select("lead_id")
        .in("lead_id", reviewLeadIds)
        .eq("event_type", "review_request_sent");

      const alreadySentIds = new Set(
        (existingReviews ?? []).map((e: { lead_id: string }) => e.lead_id),
      );

      for (const lead of reviewLeads as {
        id: string;
        first_name: string | null;
        phone: string | null;
        landing_page_id: string;
        landing_pages: { business_name: string; slug: string | null }[] | null;
      }[]) {
        if (totalSent >= MAX_PER_RUN) break;
        if (alreadySentIds.has(lead.id)) continue;
        if (!lead.phone) continue;

        const businessName =
          (Array.isArray(lead.landing_pages) ? lead.landing_pages[0]?.business_name : null) ?? "our business";
        const firstName = lead.first_name ?? "there";

        const reviewMessage = `Hi ${firstName}! Thanks for choosing ${businessName}. If you had a good experience, we'd really appreciate a quick Google review: [Google review link placeholder]. Thank you!`;

        try {
          const result = await sendSmsViaTwilio({
            to: lead.phone,
            body: reviewMessage,
            leadId: lead.id,
          });

          if (result.success) {
            await supabase.from("lead_events").insert({
              lead_id: lead.id,
              event_type: "review_request_sent",
              message: "Review request text sent",
              metadata: {
                phone: lead.phone,
                body: reviewMessage,
                channel: "sms",
                mode: result.mode,
                messageSid: result.messageSid,
              },
            });
            reviewsSent++;
            totalSent++;
            console.log(`[review-request] Review text sent to ${firstName} (${businessName})`);
          } else {
            console.error(`[review-request] SMS failed for lead ${lead.id}: ${result.error}`);
          }
        } catch (err) {
          console.error(`[review-request] Error sending review text for lead ${lead.id}:`, err);
        }
      }
    }

    // ── Stage 2: Referral requests (30-31 days after close) ──────────
    const remaining = MAX_PER_RUN - totalSent;
    if (remaining > 0) {
      const { data: referralLeads, error: referralError } = await supabase
        .from("lp_leads")
        .select(`
          id, first_name, phone, landing_page_id,
          landing_pages ( business_name, slug )
        `)
        .eq("status", "closed")
        .gte("updated_at", thirtyOneDaysAgo.toISOString())
        .lte("updated_at", thirtyDaysAgo.toISOString())
        .limit(remaining);

      if (referralError) {
        console.error("[review-request] Referral query error:", referralError);
        errors.push(referralError.message);
      }

      if (referralLeads && referralLeads.length > 0) {
        // Filter out leads that already received a referral request
        const referralLeadIds = referralLeads.map((l: { id: string }) => l.id);
        const { data: existingReferrals } = await supabase
          .from("lead_events")
          .select("lead_id")
          .in("lead_id", referralLeadIds)
          .eq("event_type", "referral_request_sent");

        const alreadyReferredIds = new Set(
          (existingReferrals ?? []).map((e: { lead_id: string }) => e.lead_id),
        );

        for (const lead of referralLeads as {
          id: string;
          first_name: string | null;
          phone: string | null;
          landing_page_id: string;
          landing_pages: { business_name: string; slug: string | null }[] | null;
        }[]) {
          if (totalSent >= MAX_PER_RUN) break;
          if (alreadyReferredIds.has(lead.id)) continue;
          if (!lead.phone) continue;

          const lp = Array.isArray(lead.landing_pages) ? lead.landing_pages[0] : null;
          const businessName = lp?.business_name ?? "our business";
          const firstName = lead.first_name ?? "there";
          const landingPageUrl = lp?.slug ? `${BASE_URL}/lp/${lp.slug}` : `${BASE_URL}`;

          const referralMessage = `Hi ${firstName}, know someone who could use ${businessName}? Share this link and they'll get a special offer: ${landingPageUrl}`;

          try {
            const result = await sendSmsViaTwilio({
              to: lead.phone,
              body: referralMessage,
              leadId: lead.id,
            });

            if (result.success) {
              await supabase.from("lead_events").insert({
                lead_id: lead.id,
                event_type: "referral_request_sent",
                message: "Referral request text sent",
                metadata: {
                  phone: lead.phone,
                  body: referralMessage,
                  channel: "sms",
                  mode: result.mode,
                  messageSid: result.messageSid,
                  landing_page_url: landingPageUrl,
                },
              });
              referralsSent++;
              totalSent++;
              console.log(`[review-request] Referral text sent to ${firstName} (${businessName})`);
            } else {
              console.error(`[review-request] SMS failed for lead ${lead.id}: ${result.error}`);
            }
          } catch (err) {
            console.error(`[review-request] Error sending referral text for lead ${lead.id}:`, err);
          }
        }
      }
    }

    console.log(
      `[review-request] Run complete: ${reviewsSent} review requests, ${referralsSent} referral requests (${totalSent} total)`,
    );

    return NextResponse.json({
      ok: true,
      reviews_sent: reviewsSent,
      referrals_sent: referralsSent,
      total_sent: totalSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[review-request] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
