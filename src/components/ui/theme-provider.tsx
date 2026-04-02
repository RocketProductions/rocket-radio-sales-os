"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type ThemeId, THEME_VARS } from "@/lib/themes";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  resolvedTheme: Exclude<ThemeId, "auto">; // what's actually applied
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "rocket",
  setTheme: () => {},
  resolvedTheme: "rocket",
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(id: ThemeId): Exclude<ThemeId, "auto"> {
  if (id === "auto") return getSystemPreference();
  return id;
}

function applyThemeVars(resolved: Exclude<ThemeId, "auto">) {
  const vars = THEME_VARS[resolved];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-theme", resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("rocket");
  const [resolved, setResolved] = useState<Exclude<ThemeId, "auto">>("rocket");
  const [mounted, setMounted] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeId | null;
    const initial = stored && ["rocket", "light", "dark", "auto"].includes(stored) ? stored : "rocket";
    setThemeState(initial);
    const r = resolveTheme(initial);
    setResolved(r);
    applyThemeVars(r);
    setMounted(true);
  }, []);

  // Listen for system preference changes when theme is "auto"
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function handler() {
      const r = resolveTheme("auto");
      setResolved(r);
      applyThemeVars(r);
    }
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(id: ThemeId) {
    setThemeState(id);
    localStorage.setItem("theme", id);
    const r = resolveTheme(id);
    setResolved(r);
    applyThemeVars(r);
  }

  // Prevent flash — don't render children until theme is applied
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
