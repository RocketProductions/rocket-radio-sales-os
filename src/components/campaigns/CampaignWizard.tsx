"use client";

import { useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BrandKitCard } from "@/components/campaigns/BrandKitCard";
import { EditableScript } from "@/components/campaigns/EditableScript";
import { EditableFunnel } from "@/components/campaigns/EditableFunnel";
import { EditableFollowUp } from "@/components/campaigns/EditableFollowUp";
import { AssetToolbar } from "@/components/campaigns/AssetToolbar";
import { useAsset } from "@/hooks/useAsset";
import {
  Loader2, Sparkles, CheckCircle2, Radio, FileText,
  MessageSquare, Globe, AlertCircle,
} from "lucide-react";
import type { BrandKit } from "@/ai/modes/brandAnalysis";
import { formatBrandContext } from "@/ai/modes/brandAnalysis";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntakeForm {
  businessName: string;
  industry: string;
  website: string;
  primaryGoal: string;
  targetAudience: string;
  offer: string;
  seasonality: string;
}

interface IntakeResult {
  offerDefinition: { offer: string; score: number; improvement?: string | null };
  campaignType: string;
  bigIdea: string;
  targetAudience: { primary: string; whyTheyRespond: string };
}

interface RadioScriptResult {
  script: string;
  wordCount: number;
  estimatedSeconds: number;
  hook: string;
  cta: string;
  directionNotes?: string | null;
}

interface FunnelCopyResult {
  headline: string;
  subheadline: string;
  bodyCopy: string[];
  trustElements: string[];
  ctaText: string;
  formFields: Array<{ name: string; type: string; required: boolean; placeholder?: string | null }>;
}

interface FollowUpResult {
  messages: Array<{
    step: number; timing: string; channel: string;
    subject?: string | null; body: string; angle: string;
  }>;
  conversionGoal: string;
  toneNotes?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generate<T>(mode: string, input: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/campaigns/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, input }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Generation failed");
  return json.data.output as T;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CampaignWizard() {
  // Stable session ID for this wizard instance
  const reactId = useId();
  const [sessionId] = useState(() => {
    // crypto.randomUUID() is available in all modern browsers and Node 18+
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return reactId.replace(/:/g, "") + Date.now().toString(36);
  });

  const [form, setForm] = useState<IntakeForm>({
    businessName: "",
    industry: "",
    website: "",
    primaryGoal: "leads",
    targetAudience: "",
    offer: "",
    seasonality: "",
  });

  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState("");

  // Brand kit
  const [brandKit, setBrandKit]       = useState<BrandKit | null>(null);
  const [brandKitId, setBrandKitId]   = useState<string | null>(null);
  const [scrapedTitle, setScrapedTitle] = useState("");
  const [scanning, setScanning]       = useState(false);
  const [scanError, setScanError]     = useState("");

  // Per-asset state with DB sync
  const briefAsset    = useAsset<IntakeResult>("brief", sessionId);
  const scriptAsset   = useAsset<RadioScriptResult>("radio-script", sessionId);
  const funnelAsset   = useAsset<FunnelCopyResult>("funnel-copy", sessionId);
  const followUpAsset = useAsset<FollowUpResult>("follow-up-sequence", sessionId);

  // The live brief (from briefAsset.data or editedContent)
  const brief = briefAsset.data;

  function update(field: keyof IntakeForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Brand kit scan ────────────────────────────────────────────────────────
  const scanWebsite = useCallback(async () => {
    const url = form.website.trim();
    if (!url) return;
    setScanning(true);
    setScanError("");
    setBrandKit(null);
    setBrandKitId(null);
    try {
      const res = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Brand scan failed");
      setBrandKit(json.kit as BrandKit);
      setBrandKitId(json.id ?? null);
      setScrapedTitle(json.scrapedTitle ?? "");
      if (!form.industry && json.kit?.industry) {
        setForm((prev) => ({ ...prev, industry: json.kit.industry }));
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Could not scan website");
    } finally {
      setScanning(false);
    }
  }, [form.website, form.industry]);

  // ── Generic AI generation runner ─────────────────────────────────────────
  async function runGenerate<T>(
    key: string,
    mode: string,
    input: Record<string, unknown>,
    onSuccess: (result: T, id: string | null) => void
  ) {
    setGeneratingKey(key);
    setGenerateError("");
    try {
      const enriched = brandKit
        ? { ...input, brandContext: formatBrandContext(brandKit) }
        : input;
      const result = await generate<T>(mode, enriched);
      onSuccess(result, brandKitId);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGeneratingKey(null);
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleBrief() {
    runGenerate<IntakeResult>("brief", "client-intake", {
      businessName: form.businessName,
      industry: form.industry,
      website: form.website || undefined,
      primaryGoal: form.primaryGoal,
      targetAudience: form.targetAudience || undefined,
      offer: form.offer || undefined,
      seasonality: form.seasonality || undefined,
    }, async (result, bkId) => {
      await briefAsset.saveNew(result, {
        businessName: form.businessName,
        brandKitId: bkId ?? undefined,
      });
    });
  }

  function handleScript() {
    runGenerate<RadioScriptResult>("script", "radio-script", {
      businessName: form.businessName,
      industry: form.industry,
      offer: brief?.offerDefinition.offer ?? form.offer,
      targetAudience: (brief?.targetAudience.primary ?? form.targetAudience) || undefined,
    }, async (result, bkId) => {
      await scriptAsset.saveNew(result, {
        businessName: form.businessName,
        brandKitId: bkId ?? undefined,
      });
    });
  }

  function handleFunnel() {
    runGenerate<FunnelCopyResult>("funnel", "funnel-copy", {
      businessName: form.businessName,
      industry: form.industry,
      offer: brief?.offerDefinition.offer ?? form.offer,
      targetAudience: (brief?.targetAudience.primary ?? form.targetAudience) || undefined,
    }, async (result, bkId) => {
      await funnelAsset.saveNew(result, {
        businessName: form.businessName,
        brandKitId: bkId ?? undefined,
      });
    });
  }

  function handleFollowUp() {
    runGenerate<FollowUpResult>("followup", "follow-up-sequence", {
      businessName: form.businessName,
      industry: form.industry,
      offer: brief?.offerDefinition.offer ?? form.offer,
    }, async (result, bkId) => {
      await followUpAsset.saveNew(result, {
        businessName: form.businessName,
        brandKitId: bkId ?? undefined,
      });
    });
  }

  const canGenerate = !!form.businessName && !!form.industry;
  const isBusy = generatingKey !== null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Intake form ── */}
      <Card>
        <CardHeader>
          <CardTitle>Client Intake</CardTitle>
          <CardDescription>
            Enter business details. Enter their website to auto-detect brand voice, colors, and key messaging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Business Name *</label>
              <Input
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                placeholder="e.g. Johnson Roofing"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Industry *</label>
              <Input
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                placeholder="e.g. Home Services / Roofing"
              />
            </div>

            {/* Website + scan */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Website
                <span className="ml-2 text-xs font-normal text-rocket-muted">
                  — scan to auto-detect brand voice, colors &amp; key phrases
                </span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={form.website}
                  onChange={(e) => {
                    update("website", e.target.value);
                    setBrandKit(null);
                    setScanError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") scanWebsite(); }}
                  placeholder="e.g. johnsonroofing.com"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={scanWebsite}
                  disabled={!form.website.trim() || scanning}
                  className="shrink-0"
                >
                  {scanning ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scanning...</>
                  ) : (
                    <><Globe className="mr-2 h-4 w-4" />Scan Website</>
                  )}
                </Button>
              </div>
              {scanError && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rocket-danger">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{scanError}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Primary Goal</label>
              <Select value={form.primaryGoal} onChange={(e) => update("primaryGoal", e.target.value)}>
                <option value="leads">Lead Generation</option>
                <option value="traffic">Foot Traffic</option>
                <option value="awareness">Brand Awareness</option>
                <option value="hiring">Hiring</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Target Audience</label>
              <Input
                value={form.targetAudience}
                onChange={(e) => update("targetAudience", e.target.value)}
                placeholder="e.g. Homeowners 35-65"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Current Offer</label>
              <Input
                value={form.offer}
                onChange={(e) => update("offer", e.target.value)}
                placeholder="e.g. Free roof inspection"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Seasonality</label>
              <Input
                value={form.seasonality}
                onChange={(e) => update("seasonality", e.target.value)}
                placeholder="e.g. Spring storm season"
              />
            </div>
          </div>

          {generateError && (
            <p className="flex items-center gap-1.5 text-sm text-rocket-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />{generateError}
            </p>
          )}

          <Button onClick={handleBrief} disabled={isBusy || !canGenerate} className="w-full md:w-auto">
            {generatingKey === "brief" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Brief...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate Campaign Brief</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Brand Kit ── */}
      {brandKit && (
        <BrandKitCard kit={brandKit} websiteUrl={form.website} scrapedTitle={scrapedTitle} />
      )}

      {/* ── Brief results ── */}
      {brief && (
        <div className="space-y-4">
          <Card className="border-rocket-accent/30 bg-rocket-accent/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rocket-accent" />
                <CardTitle className="text-lg">The Big Idea</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{brief.bigIdea}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Offer Definition</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p>{brief.offerDefinition.offer}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-rocket-muted">Offer Score:</span>
                  <Badge variant={brief.offerDefinition.score >= 7 ? "success" : "warning"}>
                    {brief.offerDefinition.score}/10
                  </Badge>
                </div>
                {brief.offerDefinition.improvement && (
                  <p className="text-sm text-rocket-muted">
                    <strong>Tip:</strong> {brief.offerDefinition.improvement}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Target Audience</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{brief.targetAudience.primary}</p>
                <p className="text-sm text-rocket-muted">{brief.targetAudience.whyTheyRespond}</p>
                <Badge variant="default" className="mt-2 text-xs">
                  {brief.campaignType.replace(/_/g, " ")}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Brief approve toolbar */}
          <Card>
            <CardContent className="pt-4">
              <AssetToolbar
                status={briefAsset.status}
                editMode={false}
                onEdit={() => {}}
                onCancelEdit={() => {}}
                onSaveEdits={() => {}}
                onApprove={briefAsset.approve}
              />
            </CardContent>
          </Card>

          {/* ── Asset generation buttons ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-rocket-success" />
                <CardTitle className="text-lg">Generate Campaign Assets</CardTitle>
              </div>
              <CardDescription>
                Brief complete{brandKit ? " · Brand kit active — AI will match their voice" : ""}.
                Generate assets below. Edit and approve each one before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleScript} disabled={isBusy} variant="outline">
                  {generatingKey === "script" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing Script...</>
                  ) : (
                    <><Radio className="mr-2 h-4 w-4" />Radio Script</>
                  )}
                </Button>
                <Button onClick={handleFunnel} disabled={isBusy} variant="outline">
                  {generatingKey === "funnel" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing Page...</>
                  ) : (
                    <><FileText className="mr-2 h-4 w-4" />Landing Page</>
                  )}
                </Button>
                <Button onClick={handleFollowUp} disabled={isBusy} variant="outline">
                  {generatingKey === "followup" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing Sequence...</>
                  ) : (
                    <><MessageSquare className="mr-2 h-4 w-4" />Follow-Up Texts</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Editable asset cards ── */}
      {scriptAsset.data   && <EditableScript   asset={scriptAsset} />}
      {funnelAsset.data   && <EditableFunnel   asset={funnelAsset} />}
      {followUpAsset.data && <EditableFollowUp asset={followUpAsset} />}
    </div>
  );
}
