/**
 * /api/stations/scrape
 *
 * POST — Scrape a radio station website to auto-detect station info.
 * Uses the shared scraper + Claude JSON extraction.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeWebsite } from "@/lib/scraper";
import { askClaudeJson } from "@/lib/claude";

const ScrapeRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

interface StationInfo {
  call_letters: string;
  frequency: string;
  format: string;
  market: string;
  display_name: string;
  logo_url: string | null;
}

/** POST /api/stations/scrape — scrape a station website for auto-detection */
export async function POST(req: Request) {
  try {
    const body = ScrapeRequestSchema.parse(await req.json());
    const scraped = await scrapeWebsite(body.url);

    const stationInfo = await askClaudeJson<StationInfo>(
      "You are a radio station data extraction assistant. Return only valid JSON, no markdown.",
      `Analyze this radio station website and extract: call_letters, frequency, format (e.g. News/Talk, Country, Classic Rock), market (city/region), and display_name. Return JSON.

Website URL: ${scraped.url}
Page Title: ${scraped.title}
Meta Description: ${scraped.metaDescription}
OG Title: ${scraped.ogTitle ?? ""}
OG Description: ${scraped.ogDescription ?? ""}
Headings: ${scraped.headings.join(" | ")}
Body Excerpt: ${scraped.bodyCopyExcerpt.slice(0, 1500)}`,
      { maxTokens: 512, temperature: 0.1 },
    );

    // Use og:image or favicon as logo_url fallback
    const logo_url = scraped.ogImage ?? scraped.favicon ?? null;

    return NextResponse.json({
      ok: true,
      station: {
        call_letters: stationInfo.call_letters ?? "",
        frequency: stationInfo.frequency ?? "",
        format: stationInfo.format ?? "",
        market: stationInfo.market ?? "",
        display_name: stationInfo.display_name ?? "",
        logo_url: stationInfo.logo_url ?? logo_url,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: err.errors },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stations/scrape POST] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
