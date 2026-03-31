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
import { prisma } from "@/lib/prisma";
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as StripeCheckoutSession;
        const tenantId = session.metadata?.tenant_id;
        const tier = session.metadata?.tier ?? "starter";

        if (!tenantId) break;

        await prisma.subscription.upsert({
          where: { tenantId },
          create: {
            tenantId,
            plan: tier,
            status: "active",
            stripeCustomerId: session.customer ?? undefined,
            stripeSubscriptionId: session.subscription ?? undefined,
          },
          update: {
            plan: tier,
            status: "active",
            stripeCustomerId: session.customer ?? undefined,
            stripeSubscriptionId: session.subscription ?? undefined,
          },
        });

        // Update tenant plan tier
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { planTier: tier },
        }).catch(() => undefined); // Silently skip if tenant not found

        console.log(`[stripe/webhook] Subscription activated: tenant=${tenantId} tier=${tier}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as StripeSubscription;
        const existing = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              status: sub.status,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : undefined,
              cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as StripeSubscription;
        const existing = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { status: "cancelled", cancelAtPeriodEnd: false },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as StripeInvoice;
        if (invoice.subscription) {
          const existing = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: invoice.subscription },
          });
          if (existing) {
            await prisma.subscription.update({
              where: { id: existing.id },
              data: { status: "past_due" },
            });
          }
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
