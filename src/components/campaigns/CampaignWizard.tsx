"use client";

import { useState, useCallback, useId, useRef } from "react";
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
import { useAsset, type AssetSeed } from "@/hooks/useAsset";
import {
  Loader2, Sparkles, CheckCircle2, Radio, FileText,
  MessageSquare, Globe, AlertCircle, Send, ExternalLink, Copy, Check, ClipboardList, Download,
} from "lucide-react";
import Link from "next/link";
import type { BrandKit } from "@/ai/modes/brandAnalysis";
import { formatBrandContext } from "@/ai/modes/brandAnalysis";
import { FRAMEWORK_NAMES } from "@/ai/modes/radioScriptFrameworks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntakeForm {
  businessName: string;
  industry: string;
  website: string;
  phone: string;
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
  script:           string;
  wordCount:        number;
  estimatedSeconds: number;
  hook:             string;
  cta:              string;
  framework?:       string | null;
  frameworkReason?: string | null;
  directionNotes?:  string | null;
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

// ─── Resume data types ────────────────────────────────────────────────────────

export interface InitialSessionData {
  sessionId: string;
  businessName: string;
  brandKit: BrandKit | null;
  brandKitId: string | null;
  /** Intake form fields saved at registration time */
  intakeForm: Partial<IntakeForm>;
  brief:    AssetSeed<IntakeResult> | null;
  script:   AssetSeed<RadioScriptResult> | null;
  funnel:   AssetSeed<FunnelCopyResult> | null;
  followUp: AssetSeed<FollowUpResult> | null;
  lpSlug:   string | null;
  liveUrl:  string | null;
  trackingPhone?: string;
  smsKeyword?: string;
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

export function CampaignWizard({ initialData }: { initialData?: InitialSessionData }) {
  // Stable session ID — reuse existing if resuming, otherwise generate fresh
  const reactId = useId();
  const [sessionId] = useState(() => {
    if (initialData?.sessionId) return initialData.sessionId;
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return reactId.replace(/:/g, "") + Date.now().toString(36);
  });

  const [form, setForm] = useState<IntakeForm>({
    businessName:   initialData?.businessName ?? "",
    industry:       initialData?.intakeForm?.industry       ?? "",
    website:        initialData?.intakeForm?.website        ?? "",
    phone:          initialData?.intakeForm?.phone          ?? "",
    primaryGoal:    initialData?.intakeForm?.primaryGoal    ?? "leads",
    targetAudience: initialData?.intakeForm?.targetAudience ?? "",
    offer:          initialData?.intakeForm?.offer          ?? "",
    seasonality:    initialData?.intakeForm?.seasonality    ?? "",
  });

  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [preferredFramework, setPreferredFramework] = useState("");

  // Brand kit — restored from saved session if resuming
  const [brandKit, setBrandKit]         = useState<BrandKit | null>(initialData?.brandKit ?? null);
  const [brandKitId, setBrandKitId]     = useState<string | null>(initialData?.brandKitId ?? null);
  const [scrapedTitle, setScrapedTitle] = useState("");
  const [colorSource, setColorSource]   = useState<string | null>(null);
  // Campaign tracking fields from brand kit (DB columns, not in BrandKit type)
  const [trackingPhone, setTrackingPhone] = useState(initialData?.trackingPhone ?? "");
  const [smsKeyword, setSmsKeyword]       = useState(initialData?.smsKeyword ?? "");
  const [scanning, setScanning]         = useState(false);
  const [scanError, setScanError]       = useState("");
  const [aiSuggestedFields, setAiSuggestedFields] = useState<string[]>([]);

  // Per-asset state — seeded from DB if resuming
  const briefAsset    = useAsset<IntakeResult>("brief", sessionId,
    initialData?.brief    ?? undefined);
  const scriptAsset   = useAsset<RadioScriptResult>("radio-script", sessionId,
    initialData?.script   ?? undefined);
  const funnelAsset   = useAsset<FunnelCopyResult>("funnel-copy", sessionId,
    initialData?.funnel   ?? undefined);
  const followUpAsset = useAsset<FollowUpResult>("follow-up-sequence", sessionId,
    initialData?.followUp ?? undefined);

  // Phase C — client review
  const [reviewUrl, setReviewUrl]         = useState("");
  const [repMessage, setRepMessage]       = useState("");
  const [sendingReview, setSendingReview] = useState(false);
  const [reviewError, setReviewError]     = useState("");
  const [copied, setCopied]               = useState(false);

  // Phase D — publish landing page
  const [slug, setSlug]               = useState(initialData?.lpSlug ?? "");
  const [publishing, setPublishing]   = useState(false);
  const [publishError, setPublishError] = useState("");
  const [liveUrl, setLiveUrl]         = useState(initialData?.liveUrl ?? "");

  // Session tracking — already registered if we're resuming
  const [sessionRegistered, setSessionRegistered] = useState(!!initialData?.sessionId);
  const [brandLimitError, setBrandLimitError]     = useState("");

  // Ref for scrolling back to intake form when editing brief
  const intakeCardRef = useRef<HTMLDivElement>(null);

  // The live brief (from briefAsset.data or editedContent)
  const brief = briefAsset.data;

  function update(field: keyof IntakeForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Auto-generate slug when business name changes
    if (field === "businessName") {
      const auto = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setSlug(auto);
    }
  }

  // ── Brand kit scan ────────────────────────────────────────────────────────
  const scanWebsite = useCallback(async () => {
    const url = form.website.trim();
    if (!url) return;
    setScanning(true);
    setScanError("");
    setBrandKit(null);
    setBrandKitId(null);
    setAiSuggestedFields([]);
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
      setColorSource(json.colorSource ?? null);
      // Campaign tracking fields from brand kit DB record
      if (json.trackingPhone) setTrackingPhone(json.trackingPhone);
      if (json.smsKeyword) setSmsKeyword(json.smsKeyword);

      // Pre-fill intake fields from multi-page scan — only if field is currently empty
      const suggested: string[] = [];
      let finalForm: IntakeForm | null = null;
      setForm((prev) => {
        const next = { ...prev };
        const intake = json.intake;

        // Auto-fill business name from page title if blank
        if (!prev.businessName && json.scrapedTitle) {
          next.businessName = json.scrapedTitle;
          // Also auto-generate slug from the scraped title
          const auto = json.scrapedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          setSlug(auto);
          suggested.push("businessName");
        }
        if (intake?.industry && !prev.industry) {
          next.industry = intake.industry;
          suggested.push("industry");
        }
        if (intake?.targetAudience && !prev.targetAudience) {
          next.targetAudience = intake.targetAudience;
          suggested.push("targetAudience");
        }
        if (intake?.seasonality && !prev.seasonality) {
          next.seasonality = intake.seasonality;
          suggested.push("seasonality");
        }
        // Fallback: use brand kit industry if intake didn't return one
        if (!next.industry && json.kit?.industry) {
          next.industry = json.kit.industry;
          suggested.push("industry");
        }
        finalForm = next;
        return next;
      });
      setAiSuggestedFields(suggested);

      // Persist the intake form early so resume works even before brief generation
      if (sessionId) {
        try {
          await fetch(`/api/campaigns/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intakeForm: finalForm }),
          });
        } catch {
          // non-fatal — session will be saved again on brief generation
        }
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Could not scan website");
    } finally {
      setScanning(false);
    }
  }, [form.website, sessionId]);

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
      // Always inject: brand context, sessionId (for doc lookup), industry (for examples)
      const enriched: Record<string, unknown> = {
        ...input,
        sessionId: sessionId,
        industry:  form.industry || input.industry,
      };
      if (brandKit) enriched.brandContext = formatBrandContext(brandKit);
      const result = await generate<T>(mode, enriched);
      onSuccess(result, brandKitId);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGeneratingKey(null);
    }
  }

  // ── Session registration ──────────────────────────────────────────────────
  async function registerSession(extra?: { lpSlug?: string; lpLive?: boolean; assetCount?: number }) {
    if (!form.businessName) return;
    try {
      const res = await fetch("/api/campaigns/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId:    sessionId,
          businessName: form.businessName,
          brandKitId:   brandKitId ?? undefined,
          intakeForm:   {
            industry:       form.industry,
            website:        form.website,
            phone:          form.phone,
            primaryGoal:    form.primaryGoal,
            targetAudience: form.targetAudience,
            offer:          form.offer,
            seasonality:    form.seasonality,
          },
          ...extra,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.error === "BRAND_LIMIT_REACHED") {
          setBrandLimitError(json.upgradeMessage ?? "Brand limit reached. Please upgrade your plan.");
        }
        return;
      }
      setBrandLimitError("");
      setSessionRegistered(true);
    } catch {
      // Non-blocking — session registration failure shouldn't block the workflow
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleBrief() {
    runGenerate<IntakeResult>("brief", "client-intake", {
      businessName:   form.businessName,
      industry:       form.industry,
      website:        form.website || undefined,
      primaryGoal:    form.primaryGoal,
      targetAudience: form.targetAudience || undefined,
      offer:          form.offer || undefined,
      seasonality:    form.seasonality || undefined,
    }, async (result, bkId) => {
      await briefAsset.saveNew(result, {
        businessName: form.businessName,
        brandKitId:   bkId ?? undefined,
        industry:     form.industry,
        bigIdea:      result.bigIdea,
        campaignType: result.campaignType,
      });
      briefAsset.setEditMode(false);
      if (!sessionRegistered) await registerSession();
    });
  }

  function handleScript(frameworkOverride?: string) {
    runGenerate<RadioScriptResult>("script", "radio-script", {
      businessName:   form.businessName,
      industry:       form.industry,
      offer:          brief?.offerDefinition.offer ?? form.offer,
      targetAudience: (brief?.targetAudience.primary ?? form.targetAudience) || undefined,
      // Ground truth — never let AI guess these
      website:        form.website  || undefined,
      phone:          form.phone    || undefined,
      // Campaign tracking — from brand kit
      trackingPhone:  trackingPhone || undefined,
      smsKeyword:     smsKeyword    || undefined,
      smsNumber:      process.env.NEXT_PUBLIC_SMS_NUMBER || undefined,
      // Brief context flows downstream
      bigIdea:        brief?.bigIdea,
      campaignType:   brief?.campaignType,
      offerScore:     brief?.offerDefinition.score,
      // Framework override — passed when rep requests a specific angle
      framework:      frameworkOverride || undefined,
    }, async (result, bkId) => {
      await scriptAsset.saveNew(result, {
        businessName: form.businessName,
        brandKitId:   bkId ?? undefined,
        industry:     form.industry,
        bigIdea:      brief?.bigIdea,
        campaignType: brief?.campaignType,
      });
    });
  }

  function handleFunnel() {
    runGenerate<FunnelCopyResult>("funnel", "funnel-copy", {
      businessName:   form.businessName,
      industry:       form.industry,
      offer:          brief?.offerDefinition.offer ?? form.offer,
      targetAudience: (brief?.targetAudience.primary ?? form.targetAudience) || undefined,
      bigIdea:        brief?.bigIdea,
      campaignType:   brief?.campaignType,
    }, async (result, bkId) => {
      await funnelAsset.saveNew(result, {
        businessName: form.businessName,
        brandKitId:   bkId ?? undefined,
        industry:     form.industry,
        bigIdea:      brief?.bigIdea,
        campaignType: brief?.campaignType,
      });
    });
  }

  function handleFollowUp() {
    runGenerate<FollowUpResult>("followup", "follow-up-sequence", {
      businessName: form.businessName,
      industry:     form.industry,
      offer:        brief?.offerDefinition.offer ?? form.offer,
      bigIdea:      brief?.bigIdea,
      campaignType: brief?.campaignType,
    }, async (result, bkId) => {
      await followUpAsset.saveNew(result, {
        businessName: form.businessName,
        brandKitId:   bkId ?? undefined,
        industry:     form.industry,
        bigIdea:      brief?.bigIdea,
        campaignType: brief?.campaignType,
      });
    });
  }

  // ── Send for Review ──────────────────────────────────────────────────────
  async function handleSendForReview() {
    const approvedIds = [briefAsset, scriptAsset, funnelAsset, followUpAsset]
      .filter((a) => a.dbId && (a.status === "saved" || a.status === "edited" || a.status === "approved"))
      .map((a) => a.dbId as string);
    if (approvedIds.length === 0) return;
    setSendingReview(true);
    setReviewError("");
    try {
      const res = await fetch("/api/review/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          assetIds: approvedIds,
          businessName: form.businessName || undefined,
          repMessage: repMessage.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setReviewUrl(json.reviewUrl);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to create review link");
    } finally {
      setSendingReview(false);
    }
  }

  function copyReviewUrl() {
    navigator.clipboard.writeText(reviewUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Publish Landing Page ──────────────────────────────────────────────────
  async function handlePublish() {
    if (!funnelAsset.dbId || !slug) return;
    setPublishing(true);
    setPublishError("");
    try {
      const res = await fetch("/api/lp/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          assetId: funnelAsset.dbId,
          brandKitId: brandKitId ?? undefined,
          slug,
          businessName: form.businessName || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setLiveUrl(json.liveUrl);
      // Update session with LP info
      await registerSession({ lpSlug: slug, lpLive: true, assetCount: 4 });
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const canGenerate = !!form.businessName && !!form.industry;
  const isBusy = generatingKey !== null;

  // Any asset is saved/edited/approved
  const hasAnyAsset = [briefAsset, scriptAsset, funnelAsset, followUpAsset].some(
    (a) => a.dbId !== null
  );
  const canPublish = funnelAsset.dbId !== null && slug.length >= 2;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Intake form ── */}
      <Card ref={intakeCardRef} className={briefAsset.editMode ? "ring-2 ring-rocket-blue" : ""}>
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
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                Industry *
                {aiSuggestedFields.includes("industry") && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">✦ AI suggested</span>
                )}
              </label>
              <Input
                value={form.industry}
                onChange={(e) => { update("industry", e.target.value); setAiSuggestedFields((p) => p.filter((f) => f !== "industry")); }}
                placeholder="e.g. Home Services / Roofing"
                className={aiSuggestedFields.includes("industry") ? "border-blue-300 bg-blue-50/30" : ""}
              />
            </div>

            {/* Website + scan */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Website
                <span className="ml-2 text-xs font-normal text-rocket-muted">
                  — scan to auto-fill industry, audience, seasonality &amp; brand voice
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
              <label className="mb-1 block text-sm font-medium">Phone Number</label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="e.g. 574-555-0100"
                type="tel"
              />
              <p className="mt-1 text-xs text-rocket-muted">Used verbatim in radio scripts — no formatting changes.</p>
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
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                Target Audience
                {aiSuggestedFields.includes("targetAudience") && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">✦ AI suggested</span>
                )}
              </label>
              <Input
                value={form.targetAudience}
                onChange={(e) => { update("targetAudience", e.target.value); setAiSuggestedFields((p) => p.filter((f) => f !== "targetAudience")); }}
                placeholder="e.g. Homeowners 35-65"
                className={aiSuggestedFields.includes("targetAudience") ? "border-blue-300 bg-blue-50/30" : ""}
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
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                Seasonality
                {aiSuggestedFields.includes("seasonality") && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">✦ AI suggested</span>
                )}
              </label>
              <Input
                value={form.seasonality}
                onChange={(e) => { update("seasonality", e.target.value); setAiSuggestedFields((p) => p.filter((f) => f !== "seasonality")); }}
                placeholder="e.g. Spring storm season"
                className={aiSuggestedFields.includes("seasonality") ? "border-blue-300 bg-blue-50/30" : ""}
              />
            </div>
          </div>

          {brandLimitError && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-medium">Brand limit reached</p>
                <p className="mt-0.5 text-amber-700">{brandLimitError}</p>
                <a href="/dashboard/billing" className="mt-1 inline-block text-xs font-medium text-amber-800 underline hover:text-amber-900">
                  View upgrade options →
                </a>
              </div>
            </div>
          )}

          {generateError && (
            <p className="flex items-center gap-1.5 text-sm text-rocket-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />{generateError}
            </p>
          )}

          <Button onClick={handleBrief} disabled={isBusy || !canGenerate || !!brandLimitError} className="w-full md:w-auto">
            {generatingKey === "brief" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Brief...</>
            ) : briefAsset.editMode ? (
              <><Sparkles className="mr-2 h-4 w-4" />Regenerate Brief</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate Campaign Brief</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Brand Kit ── */}
      {brandKit && (
        <BrandKitCard
          kit={brandKit}
          websiteUrl={form.website}
          scrapedTitle={scrapedTitle}
          brandKitId={brandKitId ?? undefined}
          colorSource={colorSource ?? undefined}
        />
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
                editMode={briefAsset.editMode}
                onEdit={() => {
                  briefAsset.setEditMode(true);
                  intakeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onCancelEdit={() => briefAsset.setEditMode(false)}
                onSaveEdits={handleBrief}
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
                <Button onClick={() => { handleScript(); }} disabled={isBusy} variant="outline">
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
      {scriptAsset.data && <EditableScript asset={scriptAsset} />}

      {/* ── Framework regeneration ── */}
      {scriptAsset.data && (
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-2">
              Try a different framework
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={preferredFramework}
                onChange={(e) => setPreferredFramework(e.target.value)}
                className="flex-1 min-w-[200px] text-sm"
              >
                <option value="">— Let AI pick the best one —</option>
                {FRAMEWORK_NAMES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => { handleScript(preferredFramework || undefined); }}
                className="shrink-0"
              >
                {generatingKey === "script" ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Writing…</>
                ) : (
                  <><Radio className="mr-1.5 h-3.5 w-3.5" />Regenerate Script</>
                )}
              </Button>
            </div>
            {scriptAsset.data.framework && (
              <p className="mt-2 text-xs text-rocket-muted">
                Current: <span className="font-medium">{scriptAsset.data.framework}</span>
                {scriptAsset.data.frameworkReason && (
                  <> — {scriptAsset.data.frameworkReason}</>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {funnelAsset.data   && <EditableFunnel   asset={funnelAsset} />}
      {followUpAsset.data && <EditableFollowUp asset={followUpAsset} />}

      {/* ── Phase C: Send for Client Review ── */}
      {hasAnyAsset && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-rocket-blue" />
              <CardTitle className="text-lg">Send for Client Review</CardTitle>
            </div>
            <CardDescription>
              Send a shareable link to your client. They can review all assets, leave notes, and approve — no login required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviewUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-rocket-success font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Review link created. Share it with your client.
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={reviewUrl}
                    className="flex-1 rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm font-mono text-rocket-muted"
                  />
                  <Button variant="outline" size="sm" onClick={copyReviewUrl} className="shrink-0">
                    {copied ? <><Check className="mr-1.5 h-4 w-4 text-rocket-success" />Copied!</> : <><Copy className="mr-1.5 h-4 w-4" />Copy</>}
                  </Button>
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center rounded-md border border-rocket-border bg-white px-3 py-1.5 text-sm font-medium text-rocket-dark hover:bg-rocket-bg transition-colors"
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />Open
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Message to client <span className="text-rocket-muted font-normal">(optional)</span></label>
                  <textarea
                    value={repMessage}
                    onChange={(e) => setRepMessage(e.target.value)}
                    placeholder="e.g. Here's your campaign draft — take a look and let me know if you'd like any changes to the script or headline."
                    className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm resize-none min-h-[72px] focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                  />
                </div>
                {reviewError && (
                  <p className="flex items-center gap-1.5 text-xs text-rocket-danger">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{reviewError}
                  </p>
                )}
                <Button onClick={handleSendForReview} disabled={sendingReview}>
                  {sendingReview ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating link...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" />Create Review Link</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Phase D: Publish Landing Page ── */}
      {funnelAsset.data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-rocket-success" />
              <CardTitle className="text-lg">Publish Landing Page</CardTitle>
            </div>
            <CardDescription>
              Publish the landing page live. Leads captured go straight into the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveUrl ? (
              <div className="space-y-4">
                <p className="text-sm text-rocket-success font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Landing page is live!
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={liveUrl}
                    className="flex-1 rounded-lg border border-rocket-border bg-rocket-bg px-3 py-2 text-sm font-mono text-rocket-muted"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(liveUrl); }}
                    className="shrink-0 inline-flex items-center rounded-lg border border-rocket-border bg-white px-3 py-1.5 text-sm font-medium text-rocket-dark hover:bg-rocket-bg transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center rounded-lg border border-rocket-border bg-white px-3 py-1.5 text-sm font-medium text-rocket-dark hover:bg-rocket-bg transition-colors"
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />View
                  </a>
                </div>
                {/* QR Code — for proposals, print materials, etc. */}
                <div className="flex items-start gap-4 rounded-xl border border-rocket-border bg-rocket-bg/50 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(liveUrl)}`}
                    alt="QR code for landing page"
                    className="h-[120px] w-[120px] rounded-lg border border-white shadow-sm shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-rocket-dark">QR Code</p>
                    <p className="mt-0.5 text-xs text-rocket-muted">
                      Add this to proposals, business cards, or print materials. Scans go directly to the landing page.
                    </p>
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(liveUrl)}`}
                      download={`qr-${slug}.png`}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rocket-border bg-white px-3 py-1.5 text-xs font-medium text-rocket-dark hover:bg-rocket-bg transition-colors"
                    >
                      <Download className="h-3 w-3" />Download PNG
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Page URL
                    <span className="ml-2 text-xs font-normal text-rocket-muted">rocketradiosales.com/lp/</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-rocket-muted shrink-0">…/lp/</span>
                    <Input
                      value={slug}
                      onChange={(e) => {
                        const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                        setSlug(clean);
                      }}
                      placeholder="johnson-roofing"
                      className="flex-1"
                    />
                  </div>
                  <p className="mt-1 text-xs text-rocket-muted">Lowercase letters, numbers, and hyphens only.</p>
                </div>
                {publishError && (
                  <p className="flex items-center gap-1.5 text-xs text-rocket-danger">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{publishError}
                  </p>
                )}
                <Button
                  onClick={handlePublish}
                  disabled={publishing || !canPublish}
                  className="bg-rocket-success hover:bg-rocket-success/90 text-white"
                >
                  {publishing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</>
                  ) : (
                    <><Globe className="mr-2 h-4 w-4" />Publish Now</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Build Proposal ─────────────────────────────────────────────────── */}
      {hasAnyAsset && (
        <Card className="border-rocket-accent/30 bg-rocket-accent/5">
          <CardContent className="flex items-center justify-between py-4 gap-4">
            <div className="min-w-0">
              <p className="font-medium text-rocket-dark text-sm">Ready to pitch?</p>
              <p className="text-xs text-rocket-muted mt-0.5">
                Assemble the big idea, offer, script, and pricing into a client proposal.
              </p>
            </div>
            <Link href={`/dashboard/proposals/new?session=${sessionId}`} className="shrink-0">
              <Button variant="outline" size="sm" className="border-rocket-accent text-rocket-accent hover:bg-rocket-accent hover:text-white">
                <ClipboardList className="mr-1.5 h-4 w-4" />
                Build Proposal
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
