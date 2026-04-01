"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Globe, Palette, Loader2, RefreshCw } from "lucide-react";
import type { BrandKit } from "@/ai/modes/brandAnalysis";

interface BrandKitCardProps {
  kit: BrandKit;
  websiteUrl: string;
  scrapedTitle?: string;
  brandKitId?: string;       // DB row ID — enables persisting color fixes
  colorSource?: string;      // 'logo' | 'css' | 'none' — shown as badge
  onColorsDetected?: (primary: string | null, secondary: string | null, accent: string | null) => void;
}

export function BrandKitCard({ kit, websiteUrl, scrapedTitle, brandKitId, colorSource, onColorsDetected }: BrandKitCardProps) {
  const displayName = scrapedTitle || websiteUrl;

  const [colors, setColors] = useState({
    primary:   kit.primaryColor   ?? null,
    secondary: kit.secondaryColor ?? null,
    accent:    kit.accentColor    ?? null,
  });
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [resolvedSource, setResolvedSource] = useState<string | null>(colorSource ?? null);

  const hasColors = colors.primary || colors.secondary || colors.accent;
  const showDetectButton = kit.logoUrl && (!hasColors || resolvedSource === "css");

  async function handleDetectFromLogo() {
    if (!kit.logoUrl || detecting) return;
    setDetecting(true);
    setDetectError(null);

    try {
      const res = await fetch("/api/brand/colors-from-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl:    kit.logoUrl,
          brandKitId: brandKitId ?? undefined,
        }),
      });
      const json = await res.json() as {
        ok: boolean;
        colors?: { primaryColor: string | null; secondaryColor: string | null; accentColor: string | null; confidence: string };
        error?: string;
      };

      if (!json.ok || !json.colors) {
        setDetectError(json.error ?? "Could not detect colors from logo");
        return;
      }

      const { primaryColor, secondaryColor, accentColor } = json.colors;
      setColors({ primary: primaryColor, secondary: secondaryColor, accent: accentColor });
      setResolvedSource("logo");
      onColorsDetected?.(primaryColor, secondaryColor, accentColor);
    } catch {
      setDetectError("Network error — please try again");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <Card className="border-rocket-accent/40 bg-gradient-to-br from-rocket-accent/5 to-rocket-blue/5">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Logo / favicon */}
          {kit.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={kit.logoUrl}
              alt="Brand logo"
              className="h-10 w-10 rounded-md object-contain border border-rocket-border bg-white p-1 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="h-10 w-10 rounded-md border border-rocket-border bg-rocket-bg flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-rocket-muted" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rocket-accent shrink-0" />
              <CardTitle className="text-sm font-semibold text-rocket-accent">Brand Kit Detected</CardTitle>
            </div>
            <p className="text-xs text-rocket-muted truncate mt-0.5">{displayName}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-rocket-dark leading-relaxed">{kit.businessDescription}</p>

        {kit.tagline && (
          <p className="text-xs italic text-rocket-muted border-l-2 border-rocket-accent/40 pl-3">
            &ldquo;{kit.tagline}&rdquo;
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Tone */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-1.5">Voice & Tone</p>
            <div className="flex flex-wrap gap-1">
              {kit.toneWords.map((word) => (
                <Badge key={word} variant="outline" className="text-xs capitalize">
                  {word}
                </Badge>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted">
                <Palette className="inline h-3 w-3 mr-1" />
                Brand Colors
                {resolvedSource === "logo" && (
                  <span className="ml-1.5 text-[10px] font-normal text-rocket-success normal-case">from logo</span>
                )}
                {resolvedSource === "css" && (
                  <span className="ml-1.5 text-[10px] font-normal text-rocket-muted normal-case">from CSS</span>
                )}
              </p>
            </div>

            {hasColors ? (
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Primary",   color: colors.primary },
                  { label: "Secondary", color: colors.secondary },
                  { label: "Accent",    color: colors.accent },
                ]
                  .filter((c) => c.color)
                  .map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span
                        className="h-5 w-5 rounded-full border border-rocket-border shrink-0 shadow-sm"
                        style={{ backgroundColor: color! }}
                      />
                      <span className="text-xs text-rocket-muted">{color}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-rocket-muted">No colors detected from CSS.</p>
            )}

            {/* Detect / re-detect button */}
            {showDetectButton && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={handleDetectFromLogo}
                disabled={detecting}
              >
                {detecting ? (
                  <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Detecting…</>
                ) : (
                  <><RefreshCw className="mr-1 h-3 w-3" />{hasColors ? "Re-detect from logo" : "Detect from logo"}</>
                )}
              </Button>
            )}

            {detectError && (
              <p className="mt-1 text-xs text-rocket-danger">{detectError}</p>
            )}
          </div>
        </div>

        {/* Key phrases */}
        {kit.keyPhrases.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-1.5">Key Phrases From Their Site</p>
            <div className="flex flex-wrap gap-1">
              {kit.keyPhrases.slice(0, 6).map((phrase) => (
                <Badge key={phrase} variant="default" className="text-xs font-normal">
                  &ldquo;{phrase}&rdquo;
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Audience + UVP */}
        <div className="grid gap-2 sm:grid-cols-2 pt-1 border-t border-rocket-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">Target Audience</p>
            <p className="text-xs text-rocket-dark">{kit.targetAudience}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">What Makes Them Different</p>
            <p className="text-xs text-rocket-dark">{kit.uniqueValueProp}</p>
          </div>
        </div>

        <p className="text-xs text-rocket-muted italic pt-1">
          This brand context is now woven into every AI generation below.
        </p>
      </CardContent>
    </Card>
  );
}
