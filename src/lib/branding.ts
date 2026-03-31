/**
 * Branding System — Per-Tenant White-Label Theming
 *
 * Every tenant can have their own:
 *   - Brand name (instead of "Rocket Radio")
 *   - Logo URL
 *   - Primary color (CSS hex)
 *   - Custom domain
 *   - Support email
 *   - Option to hide "Powered by Rocket Radio" footer
 *
 * In the layout, call resolveBranding(tenantId) and pass
 * the result as CSS custom properties.
 *
 * Fallback: if no white-label config, uses Rocket Radio defaults.
 */

export interface BrandingConfig {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  supportEmail: string;
  hideRocketBranding: boolean;
  customDomain: string | null;
}

const DEFAULTS: BrandingConfig = {
  brandName: "Rocket Radio",
  logoUrl: null,
  primaryColor: "#1B2B4B",    // rocket-dark
  accentColor: "#E53935",     // rocket-accent
  supportEmail: "support@rocketradiosales.com",
  hideRocketBranding: false,
  customDomain: null,
};

/**
 * Resolve the branding config for a given tenant.
 * Falls back to Rocket Radio defaults if the tenant has no WL config
 * or if the DB is unavailable.
 */
export async function resolveBranding(tenantId: string | null | undefined): Promise<BrandingConfig> {
  if (!tenantId) return DEFAULTS;

  try {
    const { prisma } = await import("@/lib/prisma");
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        wlBrandName: true,
        wlLogoUrl: true,
        wlPrimaryColor: true,
        wlCustomDomain: true,
        wlSupportEmail: true,
        wlHideRocketBranding: true,
      },
    });

    if (!tenant) return DEFAULTS;

    return {
      brandName: tenant.wlBrandName ?? DEFAULTS.brandName,
      logoUrl: tenant.wlLogoUrl ?? null,
      primaryColor: tenant.wlPrimaryColor ?? DEFAULTS.primaryColor,
      accentColor: DEFAULTS.accentColor,
      supportEmail: tenant.wlSupportEmail ?? DEFAULTS.supportEmail,
      hideRocketBranding: tenant.wlHideRocketBranding ?? false,
      customDomain: tenant.wlCustomDomain ?? null,
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Convert a BrandingConfig to inline CSS custom property overrides.
 * Inject this into a <style> tag or style prop to theme the page.
 *
 * Example: <style dangerouslySetInnerHTML={{ __html: brandingToCss(config) }} />
 */
export function brandingToCss(config: BrandingConfig): string {
  return `
    :root {
      --color-rocket-dark: ${config.primaryColor};
      --color-rocket-accent: ${config.accentColor};
    }
  `.trim();
}

/**
 * Get the tenant ID from a JWT payload in a server component.
 * Reads from the `auth-token` cookie via Next.js cookies().
 */
export async function getTenantIdFromCookie(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return null;

    const { verifyToken } = await import("@/lib/auth");
    const payload = await verifyToken(token);
    return payload.tenantId ?? null;
  } catch {
    return null;
  }
}
