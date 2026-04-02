"use client";

import { THEMES, type ThemeId } from "@/lib/themes";
import { useTheme } from "@/components/ui/theme-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sun, Moon, Sparkles, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_ICONS: Record<ThemeId, React.ElementType> = {
  rocket: Sparkles,
  light:  Sun,
  dark:   Moon,
  auto:   Monitor,
};

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        title="Appearance"
        subtitle="Customize how the dashboard looks for you."
      />

      {/* Theme Cards */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-rocket-dark">Color Theme</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            const Icon = THEME_ICONS[t.id];

            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "relative rounded-xl border-2 p-4 text-left transition-all duration-200",
                  isActive
                    ? "border-rocket-accent-bright ring-2 ring-rocket-accent-bright/20 shadow-md"
                    : "border-rocket-border hover:border-rocket-muted/40 hover:shadow-sm",
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-rocket-accent-bright text-white">
                    <Check className="h-3 w-3" />
                  </div>
                )}

                {/* Preview swatch */}
                <div
                  className="mb-3 flex h-16 items-end gap-1.5 rounded-lg p-2 overflow-hidden"
                  style={{ backgroundColor: t.preview.bg }}
                >
                  {/* Mini sidebar */}
                  <div
                    className="h-full w-6 rounded-md"
                    style={{ backgroundColor: t.preview.text, opacity: 0.1 }}
                  />
                  {/* Mini cards */}
                  <div className="flex-1 flex gap-1.5">
                    <div
                      className="h-8 flex-1 rounded-md shadow-sm"
                      style={{ backgroundColor: t.preview.card, border: `1px solid ${t.preview.text}10` }}
                    />
                    <div
                      className="h-8 flex-1 rounded-md shadow-sm"
                      style={{ backgroundColor: t.preview.card, border: `1px solid ${t.preview.text}10` }}
                    >
                      <div
                        className="mt-1.5 mx-1.5 h-1.5 w-6 rounded-full"
                        style={{ backgroundColor: t.preview.accent }}
                      />
                    </div>
                  </div>
                </div>

                {/* Label */}
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-rocket-muted" />
                  <div>
                    <p className="text-sm font-semibold text-rocket-dark">{t.label}</p>
                    <p className="text-xs text-rocket-muted">{t.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-rocket-muted">
            Theme preference is saved to your browser. It applies to the dashboard and client portal.
            Landing pages always use the client&apos;s brand colors.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
