"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Globe, Palette, Loader2, RefreshCw,
  Pencil, Check, X, Plus,
} from "lucide-react";
import type { BrandKit } from "@/ai/modes/brandAnalysis";

interface BrandKitCardProps {
  kit: BrandKit;
  websiteUrl: string;
  scrapedTitle?: string;
  brandKitId?: string;
  colorSource?: string;
  onColorsDetected?: (primary: string | null, secondary: string | null, accent: string | null) => void;
  onKitUpdated?: (updated: Partial<BrandKit>) => void;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function ColorSwatch({ label, color, onChange }: { label: string; color: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-rocket-muted uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-1.5">
        {/* Native color picker — the swatch itself */}
        <input
          type="color"
          value={color || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 rounded border border-rocket-border cursor-pointer p-0.5 bg-white"
          title={`Pick ${label} color`}
        />
        {/* Hex text input */}
        <input
          type="text"
          value={color}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          placeholder="#000000"
          className="w-24 rounded-md border border-rocket-border px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rocket-blue"
        />
      </div>
    </div>
  );
}

function TagEditor({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setDraft("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full border border-rocket-border bg-white px-2 py-0.5 text-xs text-rocket-dark"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="ml-0.5 text-rocket-muted hover:text-rocket-danger"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Add…"}
          className="h-7 text-xs"
        />
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={add}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BrandKitCard({
  kit,
  websiteUrl,
  scrapedTitle,
  brandKitId,
  colorSource,
  onColorsDetected,
  onKitUpdated,
}: BrandKitCardProps) {
  const displayName = scrapedTitle || websiteUrl;

  // ── Local state ────────────────────────────────────────────────────────────
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [resolvedSource, setResolvedSource] = useState<string | null>(colorSource ?? null);

  // View state (what's shown when not editing)
  const [view, setView] = useState({
    businessDescription: kit.businessDescription ?? "",
    tagline:             kit.tagline             ?? "",
    logoUrl:             kit.logoUrl             ?? "",
    primaryColor:        kit.primaryColor        ?? "",
    secondaryColor:      kit.secondaryColor      ?? "",
    accentColor:         kit.accentColor         ?? "",
    toneWords:           kit.toneWords           ?? [],
    keyPhrases:          kit.keyPhrases          ?? [],
    targetAudience:      kit.targetAudience      ?? "",
    uniqueValueProp:     kit.uniqueValueProp     ?? "",
    industry:            kit.industry            ?? "",
    trackingPhone:       (kit as Record<string, unknown>).trackingPhone as string ?? "",
    metaPixelId:         (kit as Record<string, unknown>).metaPixelId   as string ?? "",
    smsKeyword:          (kit as Record<string, unknown>).smsKeyword    as string ?? "",
    googleAdsId:         (kit as Record<string, unknown>).googleAdsId   as string ?? "",
    tiktokPixelId:       (kit as Record<string, unknown>).tiktokPixelId as string ?? "",
    calendarUrl:         (kit as Record<string, unknown>).calendarUrl   as string ?? "",
    calendarProvider:    (kit as Record<string, unknown>).calendarProvider as string ?? "",
  });

  // Draft state (what's being edited)
  const [draft, setDraft] = useState({ ...view });

  function setDraftField<K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleEdit() {
    setDraft({ ...view });
    setSaveError(null);
    setEditing(true);
  }

  function handleCancel() {
    setDraft({ ...view });
    setSaveError(null);
    setEditing(false);
  }

  async function handleSave() {
    if (!brandKitId) {
      // No DB ID — just update local view and notify parent
      setView({ ...draft });
      onKitUpdated?.(draft);
      setEditing(false);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/brand/${brandKitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDescription: draft.businessDescription  || undefined,
          tagline:             draft.tagline              || null,
          logoUrl:             draft.logoUrl              || null,
          primaryColor:        /^#[0-9a-fA-F]{6}$/.test(draft.primaryColor)   ? draft.primaryColor   : null,
          secondaryColor:      /^#[0-9a-fA-F]{6}$/.test(draft.secondaryColor) ? draft.secondaryColor : null,
          accentColor:         /^#[0-9a-fA-F]{6}$/.test(draft.accentColor)    ? draft.accentColor    : null,
          toneWords:           draft.toneWords,
          keyPhrases:          draft.keyPhrases,
          targetAudience:      draft.targetAudience  || undefined,
          uniqueValueProp:     draft.uniqueValueProp || undefined,
          industry:            draft.industry        || undefined,
          trackingPhone:       draft.trackingPhone   || null,
          metaPixelId:         draft.metaPixelId     || null,
          smsKeyword:          draft.smsKeyword      || null,
          googleAdsId:         draft.googleAdsId     || null,
          tiktokPixelId:       draft.tiktokPixelId   || null,
          calendarUrl:         draft.calendarUrl     || null,
          calendarProvider:    draft.calendarProvider || null,
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!json.ok) { setSaveError(json.error ?? "Save failed"); return; }

      setView({ ...draft });
      onKitUpdated?.(draft);
      setEditing(false);
    } catch {
      setSaveError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleDetectFromLogo() {
    const logoUrl = editing ? draft.logoUrl : view.logoUrl;
    if (!logoUrl || detecting) return;
    setDetecting(true);
    setDetectError(null);
    try {
      const res = await fetch("/api/brand/colors-from-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl, brandKitId: brandKitId ?? undefined }),
      });
      const json = await res.json() as {
        ok: boolean;
        colors?: { primaryColor: string | null; secondaryColor: string | null; accentColor: string | null };
        error?: string;
      };
      if (!json.ok || !json.colors) { setDetectError(json.error ?? "Could not detect colors"); return; }
      const { primaryColor, secondaryColor, accentColor } = json.colors;
      const updates = {
        primaryColor:   primaryColor   ?? "",
        secondaryColor: secondaryColor ?? "",
        accentColor:    accentColor    ?? "",
      };
      setView((prev) => ({ ...prev, ...updates }));
      setDraft((prev) => ({ ...prev, ...updates }));
      setResolvedSource("logo");
      onColorsDetected?.(primaryColor, secondaryColor, accentColor);
    } catch {
      setDetectError("Network error — please try again");
    } finally {
      setDetecting(false);
    }
  }

  const hasColors = view.primaryColor || view.secondaryColor || view.accentColor;
  const showDetectButton = (view.logoUrl || draft.logoUrl) && (!hasColors || resolvedSource === "css");

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <Card className="border-rocket-accent/40 bg-gradient-to-br from-rocket-accent/5 to-rocket-blue/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rocket-accent" />
              <CardTitle className="text-sm font-semibold text-rocket-accent">Edit Brand Kit</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel} disabled={saving}>
                <X className="mr-1 h-3 w-3" />Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Saving…</>
                  : <><Check className="mr-1 h-3 w-3" />Save</>
                }
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Logo URL */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-rocket-muted">Logo URL</label>
            <div className="flex gap-2 items-center">
              {draft.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.logoUrl} alt="logo" className="h-8 w-8 rounded border border-rocket-border object-contain bg-white p-0.5 shrink-0" />
              )}
              <Input
                value={draft.logoUrl}
                onChange={(e) => setDraftField("logoUrl", e.target.value)}
                placeholder="https://…"
                className="text-xs"
              />
            </div>
          </div>

          {/* Industry */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-rocket-muted">Industry</label>
            <Input
              value={draft.industry}
              onChange={(e) => setDraftField("industry", e.target.value)}
              placeholder="e.g. Roofing, Interior Design"
              className="text-xs"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-rocket-muted">Business Description</label>
            <textarea
              value={draft.businessDescription}
              onChange={(e) => setDraftField("businessDescription", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-rocket-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue"
            />
          </div>

          {/* Tagline */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-rocket-muted">Tagline</label>
            <Input
              value={draft.tagline}
              onChange={(e) => setDraftField("tagline", e.target.value)}
              placeholder="Their actual tagline if they have one"
              className="text-xs"
            />
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-rocket-muted">Brand Colors</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-rocket-muted"
                onClick={handleDetectFromLogo}
                disabled={detecting || !draft.logoUrl}
              >
                {detecting
                  ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Detecting…</>
                  : <><RefreshCw className="mr-1 h-3 w-3" />Detect from logo</>
                }
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <ColorSwatch label="Primary"   color={draft.primaryColor}   onChange={(v) => setDraftField("primaryColor", v)} />
              <ColorSwatch label="Secondary" color={draft.secondaryColor} onChange={(v) => setDraftField("secondaryColor", v)} />
              <ColorSwatch label="Accent"    color={draft.accentColor}    onChange={(v) => setDraftField("accentColor", v)} />
            </div>
            {detectError && <p className="text-xs text-rocket-danger">{detectError}</p>}
          </div>

          {/* Tone words */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-rocket-muted">Voice & Tone</label>
            <TagEditor
              tags={draft.toneWords}
              onChange={(t) => setDraftField("toneWords", t)}
              placeholder="Add tone word…"
            />
          </div>

          {/* Key phrases */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-rocket-muted">Key Phrases From Their Site</label>
            <TagEditor
              tags={draft.keyPhrases}
              onChange={(t) => setDraftField("keyPhrases", t)}
              placeholder="Add phrase…"
            />
          </div>

          {/* Target audience */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-rocket-muted">Target Audience</label>
            <Input
              value={draft.targetAudience}
              onChange={(e) => setDraftField("targetAudience", e.target.value)}
              placeholder="Who they serve"
              className="text-xs"
            />
          </div>

          {/* UVP */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-rocket-muted">What Makes Them Different</label>
            <textarea
              value={draft.uniqueValueProp}
              onChange={(e) => setDraftField("uniqueValueProp", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-rocket-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue"
            />
          </div>

          {/* ── Campaign tracking fields ─────────────────────────── */}
          <div className="border-t border-rocket-border pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted">Campaign Tracking</p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-rocket-muted">Tracking Phone Number</label>
              <Input
                value={draft.trackingPhone}
                onChange={(e) => setDraftField("trackingPhone", e.target.value)}
                placeholder="(574) 555-0100 — dedicated call tracking number"
                className="text-xs"
              />
              <p className="text-[10px] text-rocket-muted">Shows on landing page as click-to-call. Attributes calls to this campaign.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-rocket-muted">Meta Pixel ID</label>
              <Input
                value={draft.metaPixelId}
                onChange={(e) => setDraftField("metaPixelId", e.target.value)}
                placeholder="123456789012345"
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-rocket-muted">Auto-injected on landing page for retargeting visitors who don&apos;t convert.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-rocket-muted">SMS Keyword</label>
              <Input
                value={draft.smsKeyword}
                onChange={(e) => setDraftField("smsKeyword", e.target.value.toUpperCase())}
                placeholder="ROOF"
                className="text-xs font-mono uppercase"
              />
              <p className="text-[10px] text-rocket-muted">Radio CTA: &ldquo;Text {draft.smsKeyword || "KEYWORD"} to 55555&rdquo; — auto-replies with landing page link.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-rocket-muted">Google Ads ID</label>
              <Input
                value={draft.googleAdsId}
                onChange={(e) => setDraftField("googleAdsId", e.target.value)}
                placeholder="AW-123456789"
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-rocket-muted">For Google Display Network retargeting. Auto-injected on landing page.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-rocket-muted">TikTok Pixel ID</label>
              <Input
                value={draft.tiktokPixelId}
                onChange={(e) => setDraftField("tiktokPixelId", e.target.value)}
                placeholder="C123456789"
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-rocket-muted">For TikTok retargeting. Auto-injected on landing page.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-rocket-muted">Booking Calendar URL</label>
              <Input
                value={draft.calendarUrl}
                onChange={(e) => setDraftField("calendarUrl", e.target.value)}
                placeholder="https://calendly.com/yourbusiness"
                className="text-xs"
              />
              <p className="text-[10px] text-rocket-muted">Calendly, Acuity, or Google Calendar booking link. Connected bookings auto-update lead status.</p>
            </div>
          </div>

          {saveError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{saveError}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── View mode ─────────────────────────────────────────────────────────────
  return (
    <Card className="border-rocket-accent/40 bg-gradient-to-br from-rocket-accent/5 to-rocket-blue/5">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {view.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.logoUrl}
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
              <CardTitle className="text-sm font-semibold text-rocket-accent">Brand Kit</CardTitle>
              {view.industry && (
                <Badge variant="secondary" className="text-xs font-normal">{view.industry}</Badge>
              )}
            </div>
            <p className="text-xs text-rocket-muted truncate mt-0.5">{displayName}</p>
          </div>

          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={handleEdit}>
            <Pencil className="mr-1 h-3 w-3" />Edit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-rocket-dark leading-relaxed">{view.businessDescription}</p>

        {view.tagline && (
          <p className="text-xs italic text-rocket-muted border-l-2 border-rocket-accent/40 pl-3">
            &ldquo;{view.tagline}&rdquo;
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Tone */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-1.5">Voice & Tone</p>
            <div className="flex flex-wrap gap-1">
              {view.toneWords.map((word) => (
                <Badge key={word} variant="outline" className="text-xs capitalize">{word}</Badge>
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
                  { label: "Primary",   color: view.primaryColor },
                  { label: "Secondary", color: view.secondaryColor },
                  { label: "Accent",    color: view.accentColor },
                ]
                  .filter((c) => c.color)
                  .map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full border border-rocket-border shrink-0 shadow-sm" style={{ backgroundColor: color! }} />
                      <span className="text-xs text-rocket-muted">{color}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-rocket-muted">No colors detected.</p>
            )}

            {showDetectButton && (
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={handleDetectFromLogo} disabled={detecting}>
                {detecting
                  ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Detecting…</>
                  : <><RefreshCw className="mr-1 h-3 w-3" />{hasColors ? "Re-detect from logo" : "Detect from logo"}</>
                }
              </Button>
            )}
            {detectError && <p className="mt-1 text-xs text-rocket-danger">{detectError}</p>}
          </div>
        </div>

        {/* Key phrases */}
        {view.keyPhrases.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-1.5">Key Phrases From Their Site</p>
            <div className="flex flex-wrap gap-1">
              {view.keyPhrases.slice(0, 6).map((phrase) => (
                <Badge key={phrase} variant="default" className="text-xs font-normal">&ldquo;{phrase}&rdquo;</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 pt-1 border-t border-rocket-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">Target Audience</p>
            <p className="text-xs text-rocket-dark">{view.targetAudience}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">What Makes Them Different</p>
            <p className="text-xs text-rocket-dark">{view.uniqueValueProp}</p>
          </div>
        </div>

        {/* Campaign tracking */}
        {(view.trackingPhone || view.metaPixelId || view.smsKeyword || view.googleAdsId || view.tiktokPixelId || view.calendarUrl) && (
          <div className="grid gap-2 sm:grid-cols-3 pt-1 border-t border-rocket-border">
            {view.trackingPhone && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">Tracking Phone</p>
                <p className="text-xs text-rocket-dark font-mono">{view.trackingPhone}</p>
              </div>
            )}
            {view.metaPixelId && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">Meta Pixel</p>
                <p className="text-xs text-rocket-dark font-mono">{view.metaPixelId}</p>
              </div>
            )}
            {view.googleAdsId && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">Google Ads</p>
                <p className="text-xs text-rocket-dark font-mono">{view.googleAdsId}</p>
              </div>
            )}
            {view.tiktokPixelId && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">TikTok Pixel</p>
                <p className="text-xs text-rocket-dark font-mono">{view.tiktokPixelId}</p>
              </div>
            )}
            {view.smsKeyword && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">SMS Keyword</p>
                <p className="text-xs text-rocket-dark font-mono">{view.smsKeyword}</p>
              </div>
            )}
            {view.calendarUrl && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-0.5">Booking Calendar</p>
                <p className="text-xs text-rocket-dark truncate">{view.calendarUrl}</p>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-rocket-muted italic pt-1">
          This brand context is woven into every AI generation below.
        </p>
      </CardContent>
    </Card>
  );
}
