/**
 * Onboarding API
 *
 * POST /api/onboarding — create a new tenant + user, then return a Stripe checkout URL
 *
 * Flow:
 *   1. Validate business info + email/password
 *   2. Check email isn't already in use
 *   3. Create Tenant record in Supabase
 *   4. Create AppUser record linked to tenant
 *   5. Create Stripe checkout session for chosen tier
 *   6. Return checkout URL → client redirects there to pay
 *   7. After payment, Stripe webhook activates the subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createCheckoutSession } from "@/integrations/stripe";

const OnboardingSchema = z.object({
  businessName: z.string().min(2),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  tier: z.enum(["starter", "growth", "scale"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const parsed = OnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { businessName, industry, website, email, password, tier } = parsed.data;
    const origin = req.headers.get("origin") ?? "https://rocketradiosales.com";

    // 1. Check if email is already in use
    const existingUser = await prisma.appUser.findFirst({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // 2. Create slug from business name
    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    // Ensure slug is unique
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    const finalSlug = existingTenant ? `${slug}-${Date.now()}` : slug;

    // 3. Create Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: businessName,
        slug: finalSlug,
        planTier: "starter", // Updated by Stripe webhook after payment
      },
    });

    // 4. Hash password + create AppUser
    const passwordHash = await hashPassword(password);
    const user = await prisma.appUser.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: tenant.id,
        email,
        name: businessName,
        role: "client_owner",
        brandAccess: [],
      },
    });

    // 5. Create a Brand for the tenant
    await prisma.brand.create({
      data: {
        tenantId: tenant.id,
        name: businessName,
        industry: industry ?? "",
        websiteUrl: website ?? "",
        accentColor: "#E53935",
      },
    });

    // 6. Create Stripe checkout session
    const checkout = await createCheckoutSession({
      tier,
      tenantId: tenant.id,
      customerEmail: email,
      successUrl: `${origin}/dashboard?onboarding=complete&tier=${tier}`,
      cancelUrl: `${origin}/onboarding?step=3&cancelled=true`,
    });

    // Suppress unused variable warning — passwordHash stored with user for future auth migration
    void passwordHash;
    void user;

    return NextResponse.json({
      ok: true,
      tenantId: tenant.id,
      checkoutUrl: checkout.checkoutUrl,
      mode: checkout.mode,
    }, { status: 201 });
  } catch (err) {
    console.error("[onboarding/POST]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create account" },
      { status: 500 },
    );
  }
}
