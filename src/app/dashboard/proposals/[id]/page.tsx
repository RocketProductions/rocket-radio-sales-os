import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Radio, FileText, MessageSquare, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const TIER_LABELS: Record<string, string> = {
  starter: "Starter — $497/mo",
  growth: "Growth — $1,497/mo",
  scale: "Scale — $2,997/mo",
};

/**
 * Proposal Detail View
 *
 * Renders the full proposal. This is what the rep reviews before
 * sending / printing / presenting to the client.
 *
 * Future: add PDF export, "Send to client" email action.
 */
export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;

  let proposal: {
    id: string;
    status: string;
    brief: Record<string, unknown>;
    generatedCopy: Record<string, unknown> | null;
    createdAt: Date;
    brand: { name: string; industry: string | null };
  } | null = null;

  try {
    const raw = await prisma.post.findFirst({
      where: { id, contentType: "proposal" },
      select: {
        id: true,
        status: true,
        brief: true,
        generatedCopy: true,
        createdAt: true,
        brand: { select: { name: true, industry: true } },
      },
    });

    if (raw) {
      proposal = {
        ...raw,
        brief: (raw.brief as Record<string, unknown>) ?? {},
        generatedCopy: raw.generatedCopy as Record<string, unknown> | null,
      };
    }
  } catch {
    // DB not connected
  }

  if (!proposal) notFound();

  const copy = proposal.generatedCopy ?? {};
  const brief = proposal.brief;
  const tier = (brief.tier as string) ?? "starter";
  const title = (brief.title as string) ?? "Untitled Proposal";

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
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-rocket-muted">{proposal.brand.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {proposal.status}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {TIER_LABELS[tier] ?? tier}
          </Badge>
        </div>
      </div>

      {/* ─── Big Idea ─────────────────────────────────────────────────── */}
      {copy.bigIdea && (
        <Card className="border-rocket-accent bg-rocket-accent/5">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-rocket-accent">
              The Big Idea
            </p>
            <p className="mt-2 text-lg font-semibold text-rocket-dark">
              {copy.bigIdea as string}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Offer ────────────────────────────────────────────────────── */}
      {copy.offerText && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-rocket-muted" />
              The Offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-rocket-dark">
              {copy.offerText as string}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Radio Script ──────────────────────────────────────────────── */}
      {copy.radioScript && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-rocket-muted" />
              Radio Script (30 seconds)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-md bg-rocket-bg p-4 font-mono text-sm leading-relaxed text-rocket-dark">
              {copy.radioScript as string}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* ─── Landing Page ──────────────────────────────────────────────── */}
      {(copy.funnelHeadline ?? copy.funnelBody) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-rocket-muted" />
              Landing Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {copy.funnelHeadline && (
              <div>
                <p className="text-xs font-medium text-rocket-muted">Headline</p>
                <p className="mt-1 text-lg font-bold text-rocket-dark">
                  {copy.funnelHeadline as string}
                </p>
              </div>
            )}
            {copy.funnelBody && (
              <div>
                <p className="text-xs font-medium text-rocket-muted">Body Copy</p>
                <p className="mt-1 text-sm leading-relaxed text-rocket-dark">
                  {copy.funnelBody as string}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Follow-Up Plan ────────────────────────────────────────────── */}
      {copy.followUpSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-rocket-muted" />
              How We Follow Up Every Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-rocket-dark">
              {copy.followUpSummary as string}
            </p>
            <div className="mt-4 rounded-md border border-rocket-border bg-rocket-bg p-3">
              <p className="text-xs font-medium text-rocket-muted">Sequence</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {[
                  "Instant text",
                  "Day 1 email",
                  "Day 3 text",
                  "Day 7 email",
                  "Day 14 text",
                ].map((step) => (
                  <span
                    key={step}
                    className="rounded-full border border-rocket-border bg-white px-2 py-0.5 text-rocket-dark"
                  >
                    {step}
                  </span>
                ))}
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

      {/* ─── Internal Notes ───────────────────────────────────────────── */}
      {brief.notes && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-rocket-muted">Internal Notes (not shown to client)</p>
            <p className="mt-1 text-sm text-rocket-muted">{brief.notes as string}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" className="flex-1">
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
