"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";

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
  offerDefinition: { offer: string; score: number; improvement?: string };
  campaignType: string;
  bigIdea: string;
  targetAudience: { primary: string; whyTheyRespond: string };
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState("");

  function update(field: keyof IntakeForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGenerate() {
    if (!form.businessName || !form.industry) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "client-intake",
          input: {
            businessName: form.businessName,
            industry: form.industry,
            website: form.website || undefined,
            primaryGoal: form.primaryGoal,
            targetAudience: form.targetAudience || undefined,
            offer: form.offer || undefined,
            seasonality: form.seasonality || undefined,
          },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Generation failed");
      setResult(json.data.output as IntakeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

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
            <div>
              <label className="mb-1 block text-sm font-medium">Website</label>
              <Input
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="e.g. johnsonroofing.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Primary Goal</label>
              <Select
                value={form.primaryGoal}
                onChange={(e) => update("primaryGoal", e.target.value)}
              >
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
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Seasonality</label>
            <Input
              value={form.seasonality}
              onChange={(e) => update("seasonality", e.target.value)}
              placeholder="e.g. Spring storm season"
            />
          </div>

          {error && <p className="text-sm text-rocket-danger">{error}</p>}

          <Button
            onClick={handleGenerate}
            disabled={loading || !form.businessName || !form.industry}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Campaign Brief...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Campaign Brief
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Big Idea */}
          <Card className="border-rocket-accent/30 bg-rocket-accent/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rocket-accent" />
                <CardTitle className="text-lg">The Big Idea</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{result.bigIdea}</p>
            </CardContent>
          </Card>

          {/* Offer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Offer Definition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>{result.offerDefinition.offer}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-rocket-muted">Offer Score:</span>
                <Badge variant={result.offerDefinition.score >= 7 ? "success" : "warning"}>
                  {result.offerDefinition.score}/10
                </Badge>
              </div>
              {result.offerDefinition.improvement && (
                <p className="text-sm text-rocket-muted">
                  <strong>Improvement:</strong> {result.offerDefinition.improvement}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Campaign Type + Audience */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default" className="text-sm">
                  {result.campaignType.replace(/_/g, " ")}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Target Audience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{result.targetAudience.primary}</p>
                <p className="text-sm text-rocket-muted">{result.targetAudience.whyTheyRespond}</p>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-rocket-success" />
                <CardTitle className="text-lg">Next Steps</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rocket-muted">
                Campaign brief generated. Next: generate radio script, landing page copy, and follow-up sequence.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
