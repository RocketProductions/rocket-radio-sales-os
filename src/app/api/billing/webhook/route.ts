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
import { verifyWebhookSignature } from "@/integrations/stripe";

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
