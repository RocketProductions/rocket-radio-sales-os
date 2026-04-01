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
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
    const supabase = getSupabaseAdmin();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("wl_brand_name, wl_logo_url, wl_primary_color, wl_custom_domain, wl_support_email, wl_hide_rocket_branding")
      .eq("id", tenantId)
      .single();

    if (!tenant) return DEFAULTS;

    const t = tenant as {
      wl_brand_name: string | null;
      wl_logo_url: string | null;
      wl_primary_color: string | null;
      wl_custom_domain: string | null;
      wl_support_email: string | null;
      wl_hide_rocket_branding: boolean | null;
    };

    return {
      brandName: t.wl_brand_name ?? DEFAULTS.brandName,
      logoUrl: t.wl_logo_url ?? null,
      primaryColor: t.wl_primary_color ?? DEFAULTS.primaryColor,
      accentColor: DEFAULTS.accentColor,
      supportEmail: t.wl_support_email ?? DEFAULTS.supportEmail,
      hideRocketBranding: t.wl_hide_rocket_branding ?? false,
      customDomain: t.wl_custom_domain ?? null,
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
