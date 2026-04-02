/**
 * Stripe Webhook Handler
 *
 * POST /api/billing/webhook
 *
 * Receives Stripe events and updates the local subscription record.
 * Events handled:
 *   - checkout.session.completed → create/update subscription
 *   - customer.subscription.updated → update plan/status
 *   - customer.subscription.deleted → mark as cancelled
 *   - invoice.payment_failed → flag past_due
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyWebhookSignature, TIER_CONFIGS, type BillingTier } from "@/integrations/stripe";
import { sendEmailViaResend } from "@/integrations/email";
import { sendSmsViaTwilio } from "@/integrations/sms";
import { emailWrapper, emailButton } from "@/lib/emailTemplate";

// Stripe sends raw body — disable Next.js body parsing
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  // Verify the webhook is genuinely from Stripe
  if (!verifyWebhookSignature(payload, signature)) {
    console.error("[stripe/webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[stripe/webhook] Event: ${event.type}`);

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as StripeCheckoutSession;
        const tenantId = session.metadata?.tenant_id;
        const tier = session.metadata?.tier ?? "starter";

        if (!tenantId) break;

        // Upsert subscription record
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("tenant_id", tenantId)
          .single();

        if (existing) {
          await supabase
            .from("subscriptions")
            .update({
              plan: tier,
              status: "active",
              stripe_customer_id: session.customer ?? null,
              stripe_subscription_id: session.subscription ?? null,
            })
            .eq("tenant_id", tenantId);
        } else {
          await supabase.from("subscriptions").insert({
            tenant_id: tenantId,
            plan: tier,
            status: "active",
            stripe_customer_id: session.customer ?? null,
            stripe_subscription_id: session.subscription ?? null,
          });
        }

        // Update tenant plan tier
        await supabase
          .from("tenants")
          .update({ plan_tier: tier })
          .eq("id", tenantId);

        console.log(`[stripe/webhook] Subscription activated: tenant=${tenantId} tier=${tier}`);

        // ── Welcome Sequence ────────────────────────────────────────
        try {
          // 1. Fetch client_owner for this tenant
          const { data: owners } = await supabase
            .from("app_users")
            .select("email, name, phone")
            .eq("tenant_id", tenantId)
            .eq("role", "client_owner");

          // Get business name from tenant
          const { data: tenantRow } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", tenantId)
            .single();

          const businessName = (tenantRow as { name: string } | null)?.name ?? "your business";
          const tierName = TIER_CONFIGS[tier as BillingTier]?.name ?? tier;
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";
          const repEmail = process.env.REP_NOTIFICATION_EMAIL ?? "christopher.alumbaugh@gmail.com";

          if (owners && owners.length > 0) {
            for (const owner of owners as { email: string; name: string | null; phone: string | null }[]) {
              // 2. Send welcome email to client
              if (owner.email) {
                const welcomeHtml = emailWrapper(
                  "Welcome to Rocket Radio",
                  `
                    <p style="margin: 0 0 16px; font-size: 15px; color: #0B1D3A; font-weight: 600;">
                      Your campaign is live and leads are on the way.
                    </p>
                    <p style="margin: 0 0 20px; font-size: 13px; color: #5C6370;">
                      Here are 3 things to know:
                    </p>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 10px 0; font-size: 14px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8;">
                          <strong style="color: #D4A853;">1.</strong> Every lead gets a text in 60 seconds
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; font-size: 14px; color: #0B1D3A; border-bottom: 1px solid #E5E1D8;">
                          <strong style="color: #D4A853;">2.</strong> Check your dashboard anytime
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; font-size: 14px; color: #0B1D3A;">
                          <strong style="color: #D4A853;">3.</strong> Your strategist is here to help
                        </td>
                      </tr>
                    </table>
                    ${emailButton("View Your Dashboard", `${baseUrl}/portal`)}
                  `
                );

                await sendEmailViaResend({
                  to: owner.email,
                  subject: "Your campaign is live — Rocket Radio",
                  body: `Welcome to Rocket Radio!\n\nYour campaign is live and leads are on the way.\n\n3 things to know:\n1. Every lead gets a text in 60 seconds\n2. Check your dashboard anytime\n3. Your strategist is here to help\n\nView your dashboard: ${baseUrl}/portal`,
                  htmlBody: welcomeHtml,
                  tenantId,
                });
              }

              // 3. Send welcome text
              if (owner.phone) {
                await sendSmsViaTwilio({
                  to: owner.phone,
                  body: `Welcome to Rocket Radio! Your campaign is live. Log in anytime to see your leads: ${baseUrl}/portal`,
                  tenantId,
                });
              }
            }
          }

          // 4. Send rep notification email
          const tierPrices: Record<string, number> = { starter: 497, growth: 1497, scale: 2997 };
          const price = tierPrices[tier] ?? 0;

          const repHtml = emailWrapper(
            "New Client Signed Up",
            `
              <p style="margin: 0 0 16px; font-size: 15px; color: #0B1D3A;">
                <strong>${businessName}</strong> just signed up for <strong>${tierName}</strong>${price ? ` ($${price}/mo)` : ""}.
              </p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #5C6370; font-size: 13px; width: 110px;">Business</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #0B1D3A; font-weight: 600;">${businessName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #5C6370; font-size: 13px;">Tier</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #0B1D3A;">${tierName}</td>
                </tr>
                ${price ? `<tr>
                  <td style="padding: 8px 0; color: #5C6370; font-size: 13px;">Price</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #0B1D3A;">$${price}/mo</td>
                </tr>` : ""}
              </table>
              ${emailButton("View Dashboard", `${baseUrl}/dashboard`)}
            `
          );

          await sendEmailViaResend({
            to: repEmail,
            subject: `🎉 New client: ${businessName} signed up for ${tierName}`,
            body: `New client: ${businessName} signed up for ${tierName}${price ? ` ($${price}/mo)` : ""}`,
            htmlBody: repHtml,
          });
        } catch (welcomeErr) {
          // Don't fail the webhook if welcome sequence errors — subscription is already active
          console.error("[stripe/webhook] Welcome sequence error:", welcomeErr);
        }

        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as StripeSubscription;

        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (existing) {
          await supabase
            .from("subscriptions")
            .update({
              status: sub.status,
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: sub.cancel_at_period_end ?? false,
            })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as StripeSubscription;

        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", cancel_at_period_end: false })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as StripeInvoice;
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription);
        }
        break;
      }

      default:
        // Unhandled event type — that's fine
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] Error processing event:", err);
    // Return 200 anyway so Stripe doesn't retry — log the error for investigation
    return NextResponse.json({ received: true, error: "Processing error" });
  }

  return NextResponse.json({ received: true });
}

// ─── Minimal Stripe type stubs (avoids adding stripe SDK as a dep) ───

interface StripeEvent {
  type: string;
  data: { object: unknown };
}

interface StripeCheckoutSession {
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
}

interface StripeSubscription {
  id: string;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
}

interface StripeInvoice {
  subscription?: string;
}
