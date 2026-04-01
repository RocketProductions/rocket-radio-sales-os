/**
 * Stripe Integration
 *
 * Handles billing for the 3 Rocket Radio tiers.
 * Creates payment links, manages subscriptions, and processes webhooks.
 *
 * Tiers:
 *   Starter — Lead visibility + 1 campaign setup + basic auto-response
 *   Growth  — Ongoing campaign management + full sequences + retargeting
 *   Scale   — All layers + multi-campaign testing + dedicated strategy
 *
 * Requires env:
 *   STRIPE_SECRET_KEY=sk_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 *   STRIPE_PRICE_STARTER=price_...
 *   STRIPE_PRICE_GROWTH=price_...
 *   STRIPE_PRICE_SCALE=price_...
 */

import { logIntegration } from "./registry";

export type BillingTier = "starter" | "growth" | "scale";

export interface TierConfig {
  name: string;
  description: string;
  priceId: string | undefined;
  features: string[];
}

export const TIER_CONFIGS: Record<BillingTier, TierConfig> = {
  starter: {
    name: "Starter",
    description: "Lead visibility + 1 campaign + instant response",
    priceId: process.env.STRIPE_PRICE_STARTER,
    features: [
      "Lead dashboard (\"Your Leads\")",
      "Activity feed",
      "1 campaign setup",
      "Instant text to every new lead",
      "Status tracking (new → booked → closed)",
    ],
  },
  growth: {
    name: "Growth",
    description: "Full managed campaign service + follow-up sequences",
    priceId: process.env.STRIPE_PRICE_GROWTH,
    features: [
      "Everything in Starter",
      "Ongoing campaign management",
      "5-touch follow-up sequence per lead",
      "Meta ad setup",
      "Landing page",
      "Monthly performance review",
    ],
  },
  scale: {
    name: "Scale",
    description: "Multi-campaign testing + dedicated strategy + advanced reporting",
    priceId: process.env.STRIPE_PRICE_SCALE,
    features: [
      "Everything in Growth",
      "Multiple campaigns running simultaneously",
      "A/B testing",
      "Advanced reporting",
      "Dedicated strategy session monthly",
      "Priority support",
    ],
  },
};

export interface CreateCheckoutParams {
  tier: BillingTier;
  tenantId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
  mode: "live" | "stub";
}

/** Create a Stripe Checkout session for a billing tier */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult> {
  const start = Date.now();
  const tierConfig = TIER_CONFIGS[params.tier];

  if (!process.env.STRIPE_SECRET_KEY || !tierConfig.priceId) {
    console.log(`[STRIPE STUB] Checkout for tier: ${params.tier}`);
    console.log(`[STRIPE STUB] Customer: ${params.customerEmail ?? "unknown"}`);

    return {
      success: true,
      checkoutUrl: params.successUrl + "?stub=true",
      mode: "stub",
    };
  }

  try {
    const body = new URLSearchParams({
      "line_items[0][price]": tierConfig.priceId,
      "line_items[0][quantity]": "1",
      mode: "subscription",
      success_url: params.successUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: params.cancelUrl,
      "metadata[tenant_id]": params.tenantId,
      "metadata[tier]": params.tier,
    });

    if (params.customerEmail) {
      body.set("customer_email", params.customerEmail);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json() as { url?: string; id?: string; error?: { message?: string } };

    if (!res.ok) {
      const error = data.error?.message ?? `Stripe error ${res.status}`;
      await logIntegration({
        tenantId: params.tenantId,
        provider: "stripe",
        action: "create_checkout",
        status: "failed",
        errorMessage: error,
        durationMs: Date.now() - start,
      });
      return { success: false, error, mode: "live" };
    }

    await logIntegration({
      tenantId: params.tenantId,
      provider: "stripe",
      action: "create_checkout",
      status: "success",
      request: { tier: params.tier },
      response: { sessionId: data.id },
      durationMs: Date.now() - start,
    });

    return { success: true, checkoutUrl: data.url, sessionId: data.id, mode: "live" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Stripe error";
    await logIntegration({
      tenantId: params.tenantId,
      provider: "stripe",
      action: "create_checkout",
      status: "failed",
      errorMessage: error,
      durationMs: Date.now() - start,
    });
    return { success: false, error, mode: "live" };
  }
}

export interface CreatePaymentLinkParams {
  tier: BillingTier;
  tenantId?: string;
}

export interface PaymentLinkResult {
  success: boolean;
  url?: string;
  linkId?: string;
  error?: string;
  mode: "live" | "stub";
}

/** Create a reusable Stripe Payment Link for a tier */
export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
  const tierConfig = TIER_CONFIGS[params.tier];

  if (!process.env.STRIPE_SECRET_KEY || !tierConfig.priceId) {
    console.log(`[STRIPE STUB] Payment link for tier: ${params.tier}`);
    return { success: true, url: "#", mode: "stub" };
  }

  try {
    const body = new URLSearchParams({
      "line_items[0][price]": tierConfig.priceId,
      "line_items[0][quantity]": "1",
    });

    const res = await fetch("https://api.stripe.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json() as { url?: string; id?: string; error?: { message?: string } };

    if (!res.ok) {
      return { success: false, error: data.error?.message, mode: "live" };
    }

    return { success: true, url: data.url, linkId: data.id, mode: "live" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Stripe error", mode: "live" };
  }
}

/** Verify a Stripe webhook signature */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification in dev/stub mode

  // Stripe uses HMAC-SHA256 for webhook verification
  // In production, use the official Stripe SDK for this
  // For now, we do a basic check that the signature header exists
  return signature.startsWith("t=") && signature.includes("v1=");
}
