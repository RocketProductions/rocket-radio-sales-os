"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, Radio, FileText, MessageSquare } from "lucide-react";

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

interface FollowUpMessage {
  step: number;
  timing: string;
  channel: string;
  subject?: string | null;
  body: string;
  angle: string;
}

interface FollowUpResult {
  messages: FollowUpMessage[];
  conversionGoal: string;
  toneNotes?: string | null;
}

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

export function CampaignWizard() {
  const [form, setForm] = useState<IntakeForm>({
    businessName: "",
    industry: "",
    website: "",
    primaryGoal: "leads",
    targetAudience: "",
    offer: "",
    seasonality: "",
  });

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [brief, setBrief] = useState<IntakeResult | null>(null);
  const [script, setScript] = useState<RadioScriptResult | null>(null);
  const [funnel, setFunnel] = useState<FunnelCopyResult | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpResult | null>(null);

  function update(field: keyof IntakeForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function run<T>(
    key: string,
    mode: string,
    input: Record<string, unknown>,
    onSuccess: (result: T) => void
  ) {
    setLoading(key);
    setError("");
    try {
      const result = await generate<T>(mode, input);
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  function handleBrief() {
    run<IntakeResult>("brief", "client-intake", {
      businessName: form.businessName,
      industry: form.industry,
      website: form.website || undefined,
      primaryGoal: form.primaryGoal,
      targetAudience: form.targetAudience || undefined,
      offer: form.offer || undefined,
      seasonality: form.seasonality || undefined,
    }, setBrief);
  }

  function handleScript() {
    run<RadioScriptResult>("script", "radio-script", {
      businessName: form.businessName,
      industry: form.industry,
      offer: brief?.offerDefinition.offer ?? form.offer,
      targetAudience: (brief?.targetAudience.primary ?? form.targetAudience) || undefined,
      cta: undefined,
      tone: undefined,
    }, setScript);
  }

  function handleFunnel() {
    run<FunnelCopyResult>("funnel", "funnel-copy", {
      businessName: form.businessName,
      industry: form.industry,
      offer: brief?.offerDefinition.offer ?? form.offer,
      targetAudience: (brief?.targetAudience.primary ?? form.targetAudience) || undefined,
    }, setFunnel);
  }

  function handleFollowUp() {
    run<FollowUpResult>("followup", "follow-up-sequence", {
      businessName: form.businessName,
      industry: form.industry,
      offer: brief?.offerDefinition.offer ?? form.offer,
    }, setFollowUp);
  }

  const canGenerate = !!form.businessName && !!form.industry;

  return (
    <div className="space-y-6">
      {/* Intake Form */}
      <Card>
        <CardHeader>
          <CardTitle>Client Intake</CardTitle>
          <CardDescription>
            Enter the business details. AI will generate the offer, big idea, and campaign strategy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Business Name *</label>
              <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="e.g. Johnson Roofing" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Industry *</label>
              <Input value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="e.g. Home Services / Roofing" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Website</label>
              <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="e.g. johnsonroofing.com" />
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
              <Input value={form.targetAudience} onChange={(e) => update("targetAudience", e.target.value)} placeholder="e.g. Homeowners 35-65" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Current Offer</label>
              <Input value={form.offer} onChange={(e) => update("offer", e.target.value)} placeholder="e.g. Free roof inspection" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Seasonality</label>
            <Input value={form.seasonality} onChange={(e) => update("seasonality", e.target.value)} placeholder="e.g. Spring storm season" />
          </div>

          {error && <p className="text-sm text-rocket-danger">{error}</p>}

          <Button onClick={handleBrief} disabled={loading !== null || !canGenerate} className="w-full md:w-auto">
            {loading === "brief" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Brief...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Campaign Brief</>}
          </Button>
        </CardContent>
      </Card>

      {/* Brief Results */}
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
                  <p className="text-sm text-rocket-muted"><strong>Tip:</strong> {brief.offerDefinition.improvement}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Target Audience</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{brief.targetAudience.primary}</p>
                <p className="text-sm text-rocket-muted">{brief.targetAudience.whyTheyRespond}</p>
                <Badge variant="default" className="mt-2 text-xs">{brief.campaignType.replace(/_/g, " ")}</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Generate Next Steps — always visible once brief is done */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-rocket-success" />
                <CardTitle className="text-lg">Generate Campaign Assets</CardTitle>
              </div>
              <CardDescription>Brief is done. Generate the remaining assets below.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleScript} disabled={loading !== null} variant="outline">
                  {loading === "script" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing Script...</> : <><Radio className="mr-2 h-4 w-4" />Radio Script</>}
                </Button>
                <Button onClick={handleFunnel} disabled={loading !== null} variant="outline">
                  {loading === "funnel" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing Page...</> : <><FileText className="mr-2 h-4 w-4" />Landing Page</>}
                </Button>
                <Button onClick={handleFollowUp} disabled={loading !== null} variant="outline">
                  {loading === "followup" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing Sequence...</> : <><MessageSquare className="mr-2 h-4 w-4" />Follow-Up Texts</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Radio Script */}
      {script && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-rocket-accent" />
              <CardTitle className="text-lg">30-Second Radio Script</CardTitle>
            </div>
            <CardDescription>{script.wordCount} words · ~{script.estimatedSeconds} seconds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-rocket-bg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {script.script}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Hook</p>
                <p className="text-sm">{script.hook}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">CTA</p>
                <p className="text-sm">{script.cta}</p>
              </div>
            </div>
            {script.directionNotes && (
              <p className="text-xs text-rocket-muted border-t pt-3"><strong>Direction:</strong> {script.directionNotes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Funnel Copy */}
      {funnel && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-rocket-accent" />
              <CardTitle className="text-lg">Landing Page Copy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Headline</p>
              <p className="text-2xl font-bold">{funnel.headline}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Subheadline</p>
              <p className="text-base text-rocket-muted">{funnel.subheadline}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Body Copy</p>
              <div className="space-y-2">
                {funnel.bodyCopy.map((p, i) => <p key={i} className="text-sm">{p}</p>)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Trust Elements</p>
              <ul className="space-y-1">
                {funnel.trustElements.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-rocket-success shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase text-rocket-muted">CTA Button:</p>
              <Badge variant="success">{funnel.ctaText}</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-2">Form Fields</p>
              <div className="flex flex-wrap gap-2">
                {funnel.formFields.map((f, i) => (
                  <Badge key={i} variant={f.required ? "default" : "outline"}>
                    {f.name} ({f.type}){f.required ? " *" : ""}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Follow-Up Sequence */}
      {followUp && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-rocket-accent" />
              <CardTitle className="text-lg">Follow-Up Sequence</CardTitle>
            </div>
            <CardDescription>Goal: {followUp.conversionGoal}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {followUp.messages.map((msg) => (
              <div key={msg.step} className="rounded-md border border-rocket-border p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default">Step {msg.step}</Badge>
                  <Badge variant="outline">{msg.timing}</Badge>
                  <Badge variant={msg.channel === "text" ? "success" : "warning"}>{msg.channel}</Badge>
                </div>
                {msg.subject && <p className="text-xs font-semibold text-rocket-muted">Subject: {msg.subject}</p>}
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                <p className="text-xs text-rocket-muted italic">Angle: {msg.angle}</p>
              </div>
            ))}
            {followUp.toneNotes && (
              <p className="text-xs text-rocket-muted border-t pt-3"><strong>Tone notes:</strong> {followUp.toneNotes}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
