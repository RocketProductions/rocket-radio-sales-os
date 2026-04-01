"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, FileText, Sparkles } from "lucide-react";
import Link from "next/link";

type Tier = "starter" | "growth" | "scale";

const TIER_OPTIONS: { value: Tier; label: string; price: string; description: string }[] = [
  {
    value: "starter",
    label: "Starter",
    price: "$497/mo",
    description: "Lead visibility + 1 campaign setup + instant auto-response",
  },
  {
    value: "growth",
    label: "Growth",
    price: "$1,497/mo",
    description: "Full managed campaign service + 5-touch follow-up + monthly review",
  },
  {
    value: "scale",
    label: "Scale",
    price: "$2,997/mo",
    description: "Multi-campaign testing + advanced reporting + dedicated strategy",
  },
];

export type SessionOption = {
  session_id: string;
  business_name: string;
};

export type PrefilledData = {
  title: string;
  bigIdea: string;
  offerText: string;
  radioScript: string;
  funnelHeadline: string;
  funnelBody: string;
  followUpSummary: string;
};

interface Props {
  sessions: SessionOption[];
  selectedSessionId: string;
  prefilled: PrefilledData;
}

export function NewProposalClient({ sessions, selectedSessionId, prefilled }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    sessionId:       selectedSessionId,
    title:           prefilled.title,
    tier:            "starter" as Tier,
    bigIdea:         prefilled.bigIdea,
    offerText:       prefilled.offerText,
    radioScript:     prefilled.radioScript,
    funnelHeadline:  prefilled.funnelHeadline,
    funnelBody:      prefilled.funnelBody,
    followUpSummary: prefilled.followUpSummary,
    notes:           "",
  });

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSessionChange(newSessionId: string) {
    // Navigate to the same page with the new session param so the server
    // can load the assets and pre-fill the form.
    startTransition(() => {
      router.push(`/dashboard/proposals/new?session=${newSessionId}`);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) {
      setError("A proposal title is required.");
      return;
    }
    if (!form.sessionId) {
      setError("Please select a campaign.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { proposal?: { id: string }; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      router.push(`/dashboard/proposals/${data.proposal?.id}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  const selectedSession = sessions.find((s) => s.session_id === form.sessionId);
  const hasPrefilledContent = prefilled.bigIdea || prefilled.radioScript || prefilled.funnelHeadline;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/proposals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Proposals
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Proposal</h1>
          <p className="text-sm text-rocket-muted">
            Assemble the campaign into a client-ready proposal.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── Campaign Selection ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Campaign</label>
              {sessions.length === 0 ? (
                <div className="rounded-md border border-rocket-border bg-rocket-bg px-3 py-4 text-center text-sm text-rocket-muted">
                  No campaigns found.{" "}
                  <Link href="/dashboard/campaigns/new" className="text-rocket-blue underline">
                    Create one first
                  </Link>
                  .
                </div>
              ) : (
                <select
                  value={form.sessionId}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-rocket-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue disabled:opacity-50"
                >
                  <option value="">— Choose a campaign —</option>
                  {sessions.map((s) => (
                    <option key={s.session_id} value={s.session_id}>
                      {s.business_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {hasPrefilledContent && selectedSession && (
              <div className="flex items-center gap-2 rounded-md border border-rocket-success/30 bg-rocket-success/5 px-3 py-2 text-sm text-rocket-success">
                <Sparkles className="h-4 w-4 shrink-0" />
                Campaign assets loaded from <strong>{selectedSession.business_name}</strong> — review and edit below.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Basic Info ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposal Title</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g. Rocky Road Roofing — Summer Campaign"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </CardContent>
        </Card>

        {/* ─── Pricing Tier ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {TIER_OPTIONS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => set("tier", tier.value)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    form.tier === tier.value
                      ? "border-rocket-accent bg-rocket-accent/5 ring-1 ring-rocket-accent"
                      : "border-rocket-border hover:border-rocket-muted"
                  }`}
                >
                  <p className="font-semibold text-rocket-dark">{tier.label}</p>
                  <p className="mt-0.5 text-lg font-bold text-rocket-accent">{tier.price}</p>
                  <p className="mt-1 text-xs text-rocket-muted">{tier.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Campaign Content ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Campaign Content
              {hasPrefilledContent && (
                <Badge variant="secondary" className="text-xs font-normal">
                  Pre-filled from assets
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Big Idea</label>
              <textarea
                className="w-full rounded-md border border-rocket-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue"
                rows={2}
                placeholder="The single compelling concept that anchors the entire campaign"
                value={form.bigIdea}
                onChange={(e) => set("bigIdea", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Offer</label>
              <textarea
                className="w-full rounded-md border border-rocket-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue"
                rows={2}
                placeholder="The specific offer driving response (free estimate, discount, urgency)"
                value={form.offerText}
                onChange={(e) => set("offerText", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Radio Script</label>
              <textarea
                className="w-full rounded-md border border-rocket-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue font-mono"
                rows={6}
                placeholder="30-second radio spot will appear here if generated in the campaign wizard"
                value={form.radioScript}
                onChange={(e) => set("radioScript", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Landing Page Headline</label>
              <Input
                placeholder="e.g. Get Your Free Roof Inspection Before Storm Season"
                value={form.funnelHeadline}
                onChange={(e) => set("funnelHeadline", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Landing Page Body</label>
              <textarea
                className="w-full rounded-md border border-rocket-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue"
                rows={3}
                placeholder="Key selling points and trust elements"
                value={form.funnelBody}
                onChange={(e) => set("funnelBody", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Follow-Up Summary</label>
              <textarea
                className="w-full rounded-md border border-rocket-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue"
                rows={2}
                placeholder="How we'll follow up: instant text, then day 1/3/7/14 touchpoints"
                value={form.followUpSummary}
                onChange={(e) => set("followUpSummary", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Internal Notes ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full rounded-md border border-rocket-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rocket-blue"
              rows={3}
              placeholder="Notes for the rep — not shown to the client"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </CardContent>
        </Card>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" />Save Proposal</>
            )}
          </Button>
          <Link href="/dashboard/proposals">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
