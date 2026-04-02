/**
 * Theme definitions for the dashboard + portal.
 *
 * Each theme is a set of CSS custom property overrides.
 * The "rocket" theme is the default (navy + gold).
 * Applied via data-theme attribute on <html>.
 */

export type ThemeId = "rocket" | "light" | "dark" | "auto";

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  description: string;
  preview: {
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: "rocket",
    label: "Rocket Radio",
    description: "Navy + Gold — premium and authoritative",
    preview: { bg: "#F5F3EF", card: "#ffffff", accent: "#D4A853", text: "#0B1D3A" },
  },
  {
    id: "light",
    label: "Light",
    description: "Clean white — minimal and bright",
    preview: { bg: "#f8fafc", card: "#ffffff", accent: "#2563eb", text: "#0f172a" },
  },
  {
    id: "dark",
    label: "Dark",
    description: "Charcoal — easy on the eyes",
    preview: { bg: "#0f172a", card: "#1e293b", accent: "#D4A853", text: "#f1f5f9" },
  },
  {
    id: "auto",
    label: "Auto",
    description: "Follows your system preference",
    preview: { bg: "#f8fafc", card: "#ffffff", accent: "#D4A853", text: "#0f172a" },
  },
];

/** CSS variable overrides per theme (excluding "auto" which resolves to light/dark) */
export const THEME_VARS: Record<Exclude<ThemeId, "auto">, Record<string, string>> = {
  rocket: {
    "--color-rocket-blue":           "#0B1D3A",
    "--color-rocket-dark":           "#0B1D3A",
    "--color-rocket-accent":         "#B8942E",
    "--color-rocket-accent-bright":  "#D4A853",
    "--color-rocket-success":        "#1B7A4A",
    "--color-rocket-success-bright": "#22c55e",
    "--color-rocket-danger":         "#C53030",
    "--color-rocket-muted":          "#5C6370",
    "--color-rocket-bg":             "#F5F3EF",
    "--color-rocket-card":           "#ffffff",
    "--color-rocket-border":         "#E5E1D8",
  },
  light: {
    "--color-rocket-blue":           "#2563eb",
    "--color-rocket-dark":           "#0f172a",
    "--color-rocket-accent":         "#2563eb",
    "--color-rocket-accent-bright":  "#3b82f6",
    "--color-rocket-success":        "#15803d",
    "--color-rocket-success-bright": "#22c55e",
    "--color-rocket-danger":         "#dc2626",
    "--color-rocket-muted":          "#64748b",
    "--color-rocket-bg":             "#f8fafc",
    "--color-rocket-card":           "#ffffff",
    "--color-rocket-border":         "#e2e8f0",
  },
  dark: {
    "--color-rocket-blue":           "#93c5fd",
    "--color-rocket-dark":           "#f1f5f9",
    "--color-rocket-accent":         "#D4A853",
    "--color-rocket-accent-bright":  "#D4A853",
    "--color-rocket-success":        "#4ade80",
    "--color-rocket-success-bright": "#22c55e",
    "--color-rocket-danger":         "#f87171",
    "--color-rocket-muted":          "#94a3b8",
    "--color-rocket-bg":             "#0f172a",
    "--color-rocket-card":           "#1e293b",
    "--color-rocket-border":         "#334155",
  },
};
