/**
 * Multi-page intake scraper — fetches homepage + key subpages to extract
 * enough content for GPT-4o to suggest intake form fields.
 *
 * Targets: industry, targetAudience, seasonality
 * Does NOT attempt to extract "Current Offer" — that is always campaign-specific.
 */

export interface IntakePageData {
  url: string;
  text: string;      // stripped body text
  headings: string[]; // h1-h3
}

export interface IntakeScrapeData {
  baseUrl: string;
  pages: IntakePageData[];   // homepage + up to 3 subpages
  allText: string;           // combined text for AI prompt (~6000 chars)
}

// Subpage patterns to look for, in priority order
const SUBPAGE_PATTERNS = [
  /\/(services?|what-we-do|lessons?|products?|offerings?|programs?|treatments?|menu)\b/i,
  /\/(about(?:-us)?|our-story|who-we-are|team)\b/i,
  /\/(contact(?:-us)?|get-a-quote|free-estimate|schedule)\b/i,
  /\/(pricing|rates?|tuition|cost)\b/i,
];

const FETCH_OPTS = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; RocketRadioBot/1.0; +https://rocketradiosales.com)",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  },
};

/** Fetch a URL and return its raw HTML, or null on failure */
async function fetchPage(url: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      ...FETCH_OPTS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Strip HTML tags and normalize whitespace, remove nav/header/footer/script/style */
function extractText(html: string, maxChars = 2000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxChars);
}

/** Extract h1-h3 text from HTML */
function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && headings.length < 10) {
    const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text.length > 2 && text.length < 200) headings.push(text);
  }
  return headings;
}

/** Discover internal subpage links from homepage HTML, ranked by priority */
function discoverSubpages(html: string, baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin;
  const allHrefs = new Set<string>();

  // Find all <a href="..."> links
  const re = /href=["']([^"'#?]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    try {
      const resolved = new URL(href, baseUrl).href;
      // Only internal links, not the homepage itself
      if (resolved.startsWith(origin) && resolved !== baseUrl && !resolved.endsWith(".pdf")) {
        allHrefs.add(resolved);
      }
    } catch {
      // Invalid URL — skip
    }
  }

  // Score and rank by pattern priority
  const scored: Array<{ url: string; score: number }> = [];
  for (const url of allHrefs) {
    const path = new URL(url).pathname;
    for (let i = 0; i < SUBPAGE_PATTERNS.length; i++) {
      if (SUBPAGE_PATTERNS[i].test(path)) {
        scored.push({ url, score: SUBPAGE_PATTERNS.length - i }); // higher score = higher priority
        break;
      }
    }
  }

  // Sort by score descending, take top 3 unique URLs
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.url);
}

/**
 * Main entry point — fetches homepage + up to 3 subpages in parallel.
 * Returns combined content ready for GPT-4o intake analysis.
 */
export async function scrapeForIntake(url: string): Promise<IntakeScrapeData> {
  const baseUrl = url.startsWith("http") ? url : `https://${url}`;

  // 1. Fetch homepage
  const homepageHtml = await fetchPage(baseUrl, 8000);
  if (!homepageHtml) {
    throw new Error(`Could not reach ${baseUrl}`);
  }

  const homePage: IntakePageData = {
    url: baseUrl,
    text: extractText(homepageHtml, 2000),
    headings: extractHeadings(homepageHtml),
  };

  // 2. Discover and fetch subpages in parallel
  const subpageUrls = discoverSubpages(homepageHtml, baseUrl);
  const subpageResults = await Promise.allSettled(
    subpageUrls.map((u) => fetchPage(u, 5000))
  );

  const subPages: IntakePageData[] = subpageUrls
    .map((url, i) => {
      const result = subpageResults[i];
      if (result.status !== "fulfilled" || !result.value) return null;
      const html = result.value;
      return {
        url,
        text: extractText(html, 1500),
        headings: extractHeadings(html),
      };
    })
    .filter((p): p is IntakePageData => p !== null);

  const pages = [homePage, ...subPages];

  // 3. Combine all text for AI prompt
  const allText = pages
    .map((p) => {
      const slug = new URL(p.url).pathname || "/";
      const headings = p.headings.length ? `Headings: ${p.headings.join(" | ")}` : "";
      return `[Page: ${slug}]\n${headings}\n${p.text}`.trim();
    })
    .join("\n\n---\n\n")
    .slice(0, 6000);

  return { baseUrl, pages, allText };
}
