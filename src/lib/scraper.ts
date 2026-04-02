/**
 * Website scraper — extracts raw brand signals from any URL.
 * Runs server-side only. No DOM libraries needed — regex over raw HTML.
 */

export interface RawScrapeData {
  url: string;
  title: string;
  metaDescription: string;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  favicon: string | null;
  headings: string[];       // h1 + h2 text
  bodyCopyExcerpt: string;  // first ~2000 chars of visible text (stripped tags)
  cssColors: string[];      // hex/rgb values found in <style> blocks AND external stylesheets
  cssVariables: Record<string, string>; // --primary, --color-*, etc.
  canonicalUrl: string | null;
  phone: string | null;     // first US phone number found on the page
  socialLinks: {             // social media profiles found on the page
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    youtube: string | null;
    tiktok: string | null;
    yelp: string | null;
    googleBusiness: string | null;
  };
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RocketRadioBot/1.0; +https://rocketradiosales.com)",
  "Accept": "text/html,application/xhtml+xml,text/css",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Discover and fetch external stylesheet URLs from HTML (up to 3) */
async function fetchExternalStylesheets(html: string, baseUrl: string): Promise<string> {
  const origin = new URL(baseUrl).origin;
  const sheetUrls: string[] = [];

  // Match <link rel="stylesheet" href="..."> in any attribute order
  const re = /<link[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && sheetUrls.length < 3) {
    const tag = m[0];
    if (!/rel=["'][^"']*stylesheet[^"']*["']/i.test(tag)) continue;
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    try {
      const resolved = new URL(hrefMatch[1], baseUrl).href;
      // Only same-origin or absolute CSS (skip Google Fonts, etc.)
      if (resolved.startsWith(origin) || resolved.includes(".css")) {
        sheetUrls.push(resolved);
      }
    } catch { /* invalid URL */ }
  }

  if (sheetUrls.length === 0) return "";

  // Fetch all sheets in parallel with a short timeout
  const results = await Promise.allSettled(
    sheetUrls.map((u) =>
      fetch(u, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(4_000) })
        .then((r) => (r.ok ? r.text() : ""))
        .catch(() => "")
    )
  );

  return results
    .map((r) => (r.status === "fulfilled" ? r.value : ""))
    .join("\n");
}

/** Fetch a website and extract raw brand signals */
export async function scrapeWebsite(url: string): Promise<RawScrapeData> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  let html: string;
  try {
    const res = await fetch(normalizedUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    html = await res.text();
  } catch {
    throw new Error(`Could not reach ${normalizedUrl}. Check the URL and try again.`);
  }

  // Fetch external stylesheets in parallel with the rest of extraction
  const externalCss = await fetchExternalStylesheets(html, normalizedUrl);
  const allCssSource = html + "\n" + externalCss;

  return {
    url: normalizedUrl,
    title: extractTitle(html),
    metaDescription: extractMeta(html, "description") ?? "",
    ogTitle: extractOg(html, "title"),
    ogDescription: extractOg(html, "description"),
    ogImage: extractOg(html, "image") ?? extractOg(html, "image:url"),
    favicon: extractFavicon(html, normalizedUrl),
    headings: extractHeadings(html),
    bodyCopyExcerpt: extractBodyText(html),
    cssColors: extractCssColors(allCssSource),
    cssVariables: extractCssVariables(allCssSource),
    canonicalUrl: extractCanonical(html),
    phone: extractPhone(html),
    socialLinks: extractSocialLinks(html),
  };
}

// ─── Extraction helpers ────────────────────────────────────────────────────

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
}

function extractMeta(html: string, name: string): string | null {
  // name="..." or name='...'
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{1,500})["']`, "i")) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']{1,500})["'][^>]+name=["']${name}["']`, "i"));
  return m?.[1]?.trim() ?? null;
}

function extractOg(html: string, property: string): string | null {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']{1,800})["']`, "i")) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']{1,800})["'][^>]+property=["']og:${property}["']`, "i"));
  return m?.[1]?.trim() ?? null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const m =
    html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
  if (!m) return null;
  const href = m[1];
  if (href.startsWith("http")) return href;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const re = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && headings.length < 12) {
    const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text.length > 2 && text.length < 200) headings.push(text);
  }
  return headings;
}

function extractBodyText(html: string): string {
  // Remove script/style/nav/header/footer blocks first
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return stripped.slice(0, 2500);
}

function extractCssColors(source: string): string[] {
  // Pull CSS from inline <style> blocks, inline style="" attrs, AND raw CSS text
  const styleBlocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
  const inlineStyles = [...source.matchAll(/style=["']([^"']+)["']/gi)].map(m => m[1]);
  // If source contains raw CSS (no HTML tags), include it directly
  const rawCss = source.includes("{") && !source.includes("<html") ? source : "";
  const allCss = [...styleBlocks, ...inlineStyles, rawCss].join(" ");

  const hexColors = [...allCss.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)].map(m => `#${m[1]}`);
  const rgbColors = [...allCss.matchAll(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g)].map(m => m[0]);

  // Deduplicate, filter out pure white/black/near-grey, limit to 30
  const all = [...new Set([...hexColors, ...rgbColors])];
  return all
    .filter((c) => !["#fff", "#ffffff", "#000", "#000000", "#FFF", "#FFFFFF"].includes(c))
    .slice(0, 30);
}

function extractCssVariables(source: string): Record<string, string> {
  // Combine inline <style> blocks with raw CSS text from external sheets
  const styleBlocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join(" ");
  const rawCss = source.includes("{") && !source.includes("<html") ? source : "";
  const allCss = styleBlocks + " " + rawCss;

  const vars: Record<string, string> = {};
  const re = /(--[\w-]+)\s*:\s*([^;}{]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(allCss)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim();
    // Keep color-related variables
    if (key.includes("color") || key.includes("brand") || key.includes("primary") ||
        key.includes("accent") || key.includes("bg") || key.includes("text") ||
        key.includes("theme") || key.includes("palette")) {
      vars[key] = val;
    }
  }
  return vars;
}

/** Extract social media profile links from anchor hrefs */
function extractSocialLinks(html: string): RawScrapeData["socialLinks"] {
  // Collect all href values from the page
  const hrefs: string[] = [];
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    hrefs.push(m[1]);
  }

  function find(patterns: RegExp[]): string | null {
    for (const href of hrefs) {
      for (const pattern of patterns) {
        if (pattern.test(href)) return href;
      }
    }
    return null;
  }

  return {
    facebook:       find([/facebook\.com\/(?!sharer|share)[a-zA-Z0-9.]+/i]),
    instagram:      find([/instagram\.com\/[a-zA-Z0-9_.]+/i]),
    twitter:        find([/(?:twitter|x)\.com\/[a-zA-Z0-9_]+/i]),
    linkedin:       find([/linkedin\.com\/(?:company|in)\/[a-zA-Z0-9-]+/i]),
    youtube:        find([/youtube\.com\/(?:c\/|channel\/|@)[a-zA-Z0-9_-]+/i]),
    tiktok:         find([/tiktok\.com\/@[a-zA-Z0-9_.]+/i]),
    yelp:           find([/yelp\.com\/biz\/[a-zA-Z0-9-]+/i]),
    googleBusiness: find([/(?:google\.com\/maps|g\.page|business\.google\.com)\/[^\s"']+/i]),
  };
}

/** Extract the first US phone number from tel: links or visible text */
function extractPhone(html: string): string | null {
  // 1. Try tel: links first — most reliable
  const telMatch = html.match(/href=["']tel:([^"']+)["']/i);
  if (telMatch) {
    const digits = telMatch[1].replace(/\D/g, "");
    if (digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))) {
      const d = digits.length === 11 ? digits.slice(1) : digits;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    }
  }

  // 2. Regex for common US phone formats in visible text
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const phoneRe = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g;
  const matches = bodyText.match(phoneRe);
  if (matches && matches.length > 0) {
    // Return the first one, cleaned up
    const digits = matches[0].replace(/\D/g, "");
    const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (d.length === 10) {
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    }
  }

  return null;
}

function extractCanonical(html: string): string | null {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
}
