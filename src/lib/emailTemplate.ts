/**
 * Shared branded email template — navy + gold.
 *
 * All transactional emails use this wrapper for consistent branding.
 * Inline styles only (no CSS classes — email clients strip them).
 */

const NAVY = "#0B1D3A";
const GOLD = "#D4A853";
const MUTED = "#5C6370";
const BG = "#F5F3EF";
const BORDER = "#E5E1D8";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocketradiosales.com";

/**
 * Wraps email body content in a branded container.
 * @param title - Header text (shown in navy bar)
 * @param bodyHtml - Inner HTML content
 * @param footerText - Optional footer override
 */
export function emailWrapper(title: string, bodyHtml: string, footerText?: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${BG}; padding: 32px 16px;">
      <div style="max-width: 520px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: ${NAVY}; padding: 24px 28px; border-radius: 16px 16px 0 0;">
          <img src="${BASE_URL}/logo.png" alt="Rocket Radio" width="32" height="32" style="border-radius: 6px; margin-bottom: 12px;" />
          <h2 style="color: white; margin: 0; font-size: 18px; font-weight: 700;">${title}</h2>
          <div style="margin-top: 8px; height: 2px; width: 40px; background: ${GOLD}; border-radius: 1px;"></div>
        </div>

        <!-- Body -->
        <div style="background: white; border: 1px solid ${BORDER}; border-top: none; padding: 28px; border-radius: 0 0 16px 16px;">
          ${bodyHtml}
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px 0 0;">
          <p style="margin: 0; font-size: 11px; color: ${MUTED};">
            ${footerText ?? `Rocket Radio &middot; Powered by Federated Media &middot; Fort Wayne, Indiana`}
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Creates a gold CTA button.
 */
export function emailButton(text: string, href: string): string {
  return `
    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${href}" style="display: inline-block; background: ${GOLD}; color: ${NAVY}; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
        ${text} &rarr;
      </a>
    </div>
  `;
}

/**
 * Creates a labeled data row for tables.
 */
export function emailRow(label: string, value: string, isLink?: boolean): string {
  const val = isLink
    ? `<a href="${value.startsWith("http") ? value : `https://${value}`}" style="color: ${NAVY}; text-decoration: none;">${value}</a>`
    : value;
  return `
    <tr>
      <td style="padding: 8px 0; color: ${MUTED}; font-size: 13px; width: 110px; vertical-align: top;">${label}</td>
      <td style="padding: 8px 0; font-size: 14px; color: ${NAVY};">${val}</td>
    </tr>
  `;
}

/**
 * Creates a phone number link.
 */
export function emailPhone(label: string, phone: string): string {
  return `
    <tr>
      <td style="padding: 8px 0; color: ${MUTED}; font-size: 13px; width: 110px; vertical-align: top;">${label}</td>
      <td style="padding: 8px 0; font-size: 14px;"><a href="tel:${phone}" style="color: ${NAVY}; text-decoration: none; font-weight: 600;">${phone}</a></td>
    </tr>
  `;
}

/**
 * Success callout box (green tint).
 */
export function emailSuccess(text: string): string {
  return `
    <div style="margin-top: 16px; padding: 12px 16px; background: #f0fdf4; border-radius: 10px; font-size: 13px; color: #166534;">
      &#x2713; ${text}
    </div>
  `;
}

/**
 * Stat card for digest emails — centered number + label + optional trend.
 */
export function emailStatCard(value: string | number, label: string, trend?: string): string {
  const trendColor = trend?.startsWith("+") ? "#1B7A4A" : trend?.startsWith("-") ? "#C53030" : MUTED;
  return `
    <div style="flex: 1; background: ${BG}; border-radius: 10px; padding: 16px; text-align: center;">
      <div style="font-size: 28px; font-weight: 700; color: ${NAVY};">${value}</div>
      <div style="font-size: 12px; color: ${MUTED}; margin-top: 2px;">${label}</div>
      ${trend ? `<div style="font-size: 11px; color: ${trendColor}; margin-top: 4px;">${trend}</div>` : ""}
    </div>
  `;
}

/**
 * Row of stat cards (uses table for email client compatibility).
 */
export function emailStatRow(cards: string[]): string {
  return `
    <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 20px;">
      <tr>
        ${cards.map((c) => `<td style="width: ${Math.round(100 / cards.length)}%; vertical-align: top;">${c}</td>`).join("")}
      </tr>
    </table>
  `;
}

/**
 * Info callout box (gold tint).
 */
export function emailInfo(text: string): string {
  return `
    <div style="margin-top: 16px; padding: 12px 16px; background: ${GOLD}10; border: 1px solid ${GOLD}30; border-radius: 10px; font-size: 13px; color: ${NAVY};">
      ${text}
    </div>
  `;
}
