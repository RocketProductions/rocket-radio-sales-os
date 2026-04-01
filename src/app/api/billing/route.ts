/**
 * Billing API
 *
 * POST /api/billing — Create a checkout session or payment link for a tier
 * GET  /api/billing — Get current subscription status for a tenant
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession, TIER_CONFIGS, type BillingTier } from "@/integrations/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CreateCheckoutSchema = z.object({
  tier: z.enum(["starter", "growth", "scale"]),
  tenantId: z.string(),
  customerEmail: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

/** POST /api/billing — create a Stripe checkout session */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const parsed = CreateCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { tier, tenantId, customerEmail } = parsed.data;
    const origin = req.headers.get("origin") ?? "https://rocketradiosales.com";

    const result = await createCheckoutSession({
      tier,
      tenantId,
      customerEmail,
      successUrl: `${origin}/dashboard?billing=success&tier=${tier}`,
      cancelUrl: `${origin}/dashboard?billing=cancelled`,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
      mode: result.mode,
      tier: TIER_CONFIGS[tier as BillingTier],
    });
  } catch (err) {
    console.error("[billing/POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET /api/billing?tenantId=xxx — get subscription status */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    // Return tier configs for pricing page
    return NextResponse.json({ tiers: TIER_CONFIGS });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end")
      .eq("tenant_id", tenantId)
      .single();

    return NextResponse.json({
      subscription: subscription
        ? {
            plan: (subscription as { plan: string }).plan,
            status: (subscription as { status: string }).status,
            currentPeriodEnd: (subscription as { current_period_end: string | null }).current_period_end,
            cancelAtPeriodEnd: (subscription as { cancel_at_period_end: boolean }).cancel_at_period_end,
          }
        : null,
      tiers: TIER_CONFIGS,
    });
  } catch {
    return NextResponse.json({ subscription: null, tiers: TIER_CONFIGS });
  }
}
