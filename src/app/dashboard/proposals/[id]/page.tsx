import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Radio, FileText, MessageSquare, Globe, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

type ProposalDetail = {
  id: string;
  title: string;
  status: string;
  tier: string;
  big_idea: string | null;
  offer_text: string | null;
  radio_script: string | null;
  funnel_headline: string | null;
  funnel_body: string | null;
  follow_up_summary: string | null;
  notes: string | null;
  created_at: string;
  session_id: string | null;
  campaign_sessions: { business_name: string } | null;
};

const TIER_LABELS: Record<string, string> = {
  starter: "Starter — $497/mo",
  growth:  "Growth — $1,497/mo",
  scale:   "Scale — $2,997/mo",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-rocket-muted/10 text-rocket-muted border-rocket-muted/20",
  ready: "bg-blue-50 text-blue-700 border-blue-200",
  sent:  "bg-rocket-success/10 text-rocket-success border-rocket-success/20",
};

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: raw, error } = await supabase
    .from("proposals")
    .select(`
      id, title, status, tier,
      big_idea, offer_text, radio_script,
      funnel_headline, funnel_body, follow_up_summary,
      notes, created_at, session_id,
      campaign_sessions ( business_name )
    `)
    .eq("id", id)
    .single();

  if (error || !raw) notFound();

  const proposal = raw as unknown as ProposalDetail;
  const tier = proposal.tier ?? "starter";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/proposals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Proposals
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{proposal.title}</h1>
            <p className="text-sm text-rocket-muted">
              {proposal.campaign_sessions?.business_name ?? "No campaign linked"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${STATUS_COLORS[proposal.status] ?? ""}`}
          >
            {proposal.status}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {TIER_LABELS[tier] ?? tier}
          </Badge>
        </div>
      </div>

      {/* ─── Big Idea ─────────────────────────────────────────────────── */}
      {proposal.big_idea && (
        <Card className="border-rocket-accent bg-rocket-accent/5">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-rocket-accent">
              The Big Idea
            </p>
            <p className="mt-2 text-lg font-semibold text-rocket-dark">
              {proposal.big_idea}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Offer ────────────────────────────────────────────────────── */}
      {proposal.offer_text && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-rocket-muted" />
              The Offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-rocket-dark">
              {proposal.offer_text}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Radio Script ──────────────────────────────────────────────── */}
      {proposal.radio_script && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-rocket-muted" />
              Radio Script (30 seconds)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-md bg-rocket-bg p-4 font-mono text-sm leading-relaxed text-rocket-dark">
              {proposal.radio_script}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* ─── Landing Page ──────────────────────────────────────────────── */}
      {(proposal.funnel_headline || proposal.funnel_body) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-rocket-muted" />
              Landing Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proposal.funnel_headline && (
              <div>
                <p className="text-xs font-medium text-rocket-muted">Headline</p>
                <p className="mt-1 text-lg font-bold text-rocket-dark">
                  {proposal.funnel_headline}
                </p>
              </div>
            )}
            {proposal.funnel_body && (
              <div>
                <p className="text-xs font-medium text-rocket-muted">Body Copy</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-rocket-dark">
                  {proposal.funnel_body}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Follow-Up Plan ────────────────────────────────────────────── */}
      {proposal.follow_up_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-rocket-muted" />
              How We Follow Up Every Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-rocket-dark">
              {proposal.follow_up_summary}
            </p>
            <div className="mt-4 rounded-md border border-rocket-border bg-rocket-bg p-3">
              <p className="text-xs font-medium text-rocket-muted">Sequence</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {["Instant text", "Day 1 email", "Day 3 text", "Day 7 email", "Day 14 text"].map(
                  (step) => (
                    <span
                      key={step}
                      className="rounded-full border border-rocket-border bg-white px-2 py-0.5 text-rocket-dark"
                    >
                      {step}
                    </span>
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Pricing ──────────────────────────────────────────────────── */}
      <Card className="border-2 border-rocket-dark">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-rocket-muted">
                Investment
              </p>
              <p className="mt-1 text-2xl font-bold text-rocket-dark">
                {TIER_LABELS[tier] ?? tier}
              </p>
              <p className="mt-1 text-sm text-rocket-muted">
                Month-to-month. No long-term contract required.
              </p>
            </div>
            <Badge variant="outline" className="text-sm font-semibold">
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ─── Campaign Link ─────────────────────────────────────────────── */}
      {proposal.session_id && (
        <div className="flex items-center gap-2 rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm text-rocket-muted">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>Linked to campaign:</span>
          <Link
            href={`/dashboard/campaigns/new?session=${proposal.session_id}`}
            className="font-medium text-rocket-blue hover:underline"
          >
            {proposal.campaign_sessions?.business_name ?? proposal.session_id}
          </Link>
        </div>
      )}

      {/* ─── Internal Notes ───────────────────────────────────────────── */}
      {proposal.notes && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-rocket-muted">
              Internal Notes (not shown to client)
            </p>
            <p className="mt-1 text-sm text-rocket-muted">{proposal.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ─── Actions ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" className="flex-1" disabled>
          Print / Export PDF
        </Button>
        <Link href="/dashboard/proposals" className="flex-1">
          <Button variant="ghost" className="w-full">
            Back to proposals
          </Button>
        </Link>
      </div>
    </div>
  );
}
