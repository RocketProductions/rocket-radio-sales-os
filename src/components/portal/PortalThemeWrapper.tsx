"use client";

import { ThemeProvider } from "@/components/ui/theme-provider";

export function PortalThemeWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
