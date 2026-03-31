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
  cssColors: string[];      // hex/rgb values found in <style> blocks
  cssVariables: Record<string, string>; // --primary, --color-*, etc.
  canonicalUrl: string | null;
}

/** Fetch a website and extract raw brand signals */
export async function scrapeWebsite(url: string): Promise<RawScrapeData> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  let html: string;
  try {
    const res = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RocketRadioBot/1.0; +https://rocketradiosales.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10_000),
    });
    html = await res.text();
  } catch {
    throw new Error(`Could not reach ${normalizedUrl}. Check the URL and try again.`);
  }

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
    cssColors: extractCssColors(html),
    cssVariables: extractCssVariables(html),
    canonicalUrl: extractCanonical(html),
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

function extractCssColors(html: string): string[] {
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
  const inlineStyles = [...html.matchAll(/style=["']([^"']+)["']/gi)].map(m => m[1]);
  const allCss = [...styleBlocks, ...inlineStyles].join(" ");

  const hexColors = [...allCss.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map(m => `#${m[1]}`);
  const rgbColors = [...allCss.matchAll(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g)].map(m => m[0]);

  // Deduplicate and limit
  return [...new Set([...hexColors, ...rgbColors])].slice(0, 20);
}

function extractCssVariables(html: string): Record<string, string> {
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join(" ");
  const vars: Record<string, string> = {};
  const re = /(--[\w-]+)\s*:\s*([^;}{]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(styleBlocks)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim();
    // Only keep color-looking variables
    if (key.includes("color") || key.includes("brand") || key.includes("primary") ||
        key.includes("accent") || key.includes("bg") || key.includes("text")) {
      vars[key] = val;
    }
  }
  return vars;
}

function extractCanonical(html: string): string | null {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
}
