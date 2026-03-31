/**
 * Apollo.io Integration — Business Enrichment
 *
 * Used during client intake to enrich business data before building a campaign.
 * Looks up the business by domain/name and returns enriched firmographic data:
 * - Employee count, revenue estimate, industry vertical
 * - Key decision-maker contact info
 * - Technology stack (useful for ad targeting)
 *
 * Requires env:
 *   APOLLO_API_KEY=xxxx
 *
 * In dev/demo with no key: returns mock enrichment data.
 */

import { logIntegration } from "./registry";

export interface EnrichBusinessParams {
  domain?: string;       // e.g., "rockyroadroofing.com"
  name?: string;         // Business name (fallback if no domain)
  city?: string;
  state?: string;
  tenantId?: string;
}

export interface EnrichedBusiness {
  name?: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenueRange?: string;
  city?: string;
  state?: string;
  phone?: string;
  linkedinUrl?: string;
  foundedYear?: number;
  description?: string;
  technologies?: string[];
}

export interface EnrichResult {
  success: boolean;
  data?: EnrichedBusiness;
  error?: string;
  mode: "live" | "stub";
}

/** Enrich a business using Apollo.io (or stub in dev) */
export async function enrichBusinessViaApollo(params: EnrichBusinessParams): Promise<EnrichResult> {
  const start = Date.now();

  if (!process.env.APOLLO_API_KEY) {
    // Stub mode — return mock data that looks realistic
    console.log(`[APOLLO STUB] Enriching: ${params.domain ?? params.name}`);

    await logIntegration({
      tenantId: params.tenantId,
      provider: "apollo",
      action: "enrich_business",
      status: "skipped",
      request: { domain: params.domain, name: params.name },
      durationMs: Date.now() - start,
    });

    return {
      success: true,
      mode: "stub",
      data: {
        name: params.name,
        domain: params.domain,
        industry: "Local Business",
        employeeCount: 10,
        revenueRange: "$1M-$5M",
        city: params.city,
        state: params.state,
      },
    };
  }

  try {
    // Apollo organization search
    const searchBody: Record<string, unknown> = {
      api_key: process.env.APOLLO_API_KEY,
      page: 1,
      per_page: 1,
    };

    if (params.domain) {
      searchBody.q_organization_domains = params.domain;
    } else if (params.name) {
      searchBody.q_organization_name = params.name;
    }

    const res = await fetch("https://api.apollo.io/api/v1/organizations/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchBody),
    });

    const data = await res.json() as {
      organizations?: Array<{
        name?: string;
        website_url?: string;
        industry?: string;
        estimated_num_employees?: number;
        annual_revenue_printed?: string;
        city?: string;
        state?: string;
        phone?: string;
        linkedin_url?: string;
        founded_year?: number;
        short_description?: string;
        current_technologies?: Array<{ name?: string }>;
      }>;
      error?: string;
    };

    if (!res.ok || data.error) {
      const error = data.error ?? `Apollo error ${res.status}`;
      await logIntegration({
        tenantId: params.tenantId,
        provider: "apollo",
        action: "enrich_business",
        status: "failed",
        errorMessage: error,
        durationMs: Date.now() - start,
      });
      return { success: false, error, mode: "live" };
    }

    const org = data.organizations?.[0];
    if (!org) {
      return { success: true, mode: "live", data: {} };
    }

    const enriched: EnrichedBusiness = {
      name: org.name,
      domain: org.website_url?.replace(/^https?:\/\//, ""),
      industry: org.industry,
      employeeCount: org.estimated_num_employees,
      revenueRange: org.annual_revenue_printed,
      city: org.city,
      state: org.state,
      phone: org.phone,
      linkedinUrl: org.linkedin_url,
      foundedYear: org.founded_year,
      description: org.short_description,
      technologies: org.current_technologies?.map((t) => t.name ?? "").filter(Boolean),
    };

    await logIntegration({
      tenantId: params.tenantId,
      provider: "apollo",
      action: "enrich_business",
      status: "success",
      request: { domain: params.domain, name: params.name },
      response: { found: !!org, name: org.name },
      durationMs: Date.now() - start,
    });

    return { success: true, data: enriched, mode: "live" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Apollo error";
    await logIntegration({
      tenantId: params.tenantId,
      provider: "apollo",
      action: "enrich_business",
      status: "failed",
      errorMessage: error,
      durationMs: Date.now() - start,
    });
    return { success: false, error, mode: "live" };
  }
}

export interface EnrichContactParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  domain?: string;
  tenantId?: string;
}

export interface EnrichedContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  linkedinUrl?: string;
  company?: string;
}

export interface ContactEnrichResult {
  success: boolean;
  data?: EnrichedContact;
  error?: string;
  mode: "live" | "stub";
}

/** Enrich a contact (lead or prospect) using Apollo.io */
export async function enrichContactViaApollo(
  params: EnrichContactParams,
): Promise<ContactEnrichResult> {
  const start = Date.now();

  if (!process.env.APOLLO_API_KEY) {
    console.log(`[APOLLO STUB] Enriching contact: ${params.email ?? params.firstName}`);
    return { success: true, mode: "stub", data: { ...params } };
  }

  try {
    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.APOLLO_API_KEY,
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        domain: params.domain,
      }),
    });

    const data = await res.json() as {
      person?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone_numbers?: Array<{ sanitized_number?: string }>;
        title?: string;
        linkedin_url?: string;
        organization?: { name?: string };
      };
      error?: string;
    };

    if (!res.ok || data.error) {
      return { success: false, error: data.error ?? "Apollo error", mode: "live" };
    }

    const p = data.person;
    return {
      success: true,
      mode: "live",
      data: {
        firstName: p?.first_name,
        lastName: p?.last_name,
        email: p?.email,
        phone: p?.phone_numbers?.[0]?.sanitized_number,
        title: p?.title,
        linkedinUrl: p?.linkedin_url,
        company: p?.organization?.name,
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Apollo error";
    await logIntegration({
      tenantId: params.tenantId,
      provider: "apollo",
      action: "enrich_contact",
      status: "failed",
      errorMessage: error,
      durationMs: Date.now() - start,
    });
    return { success: false, error, mode: "live" };
  }
}
