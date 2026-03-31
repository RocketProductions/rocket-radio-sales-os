import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Proposals List (internal)
 *
 * Where reps assemble a client proposal from AI-generated campaign outputs.
 * A proposal = big idea + offer + radio script + funnel headline + pricing tier.
 * It's a leave-behind after a pitch call, or a PDF to email the client.
 */
export default async function ProposalsPage() {
  let proposals: Array<{
    id: string;
    status: string;
    brief: { title?: string; tier?: string };
    createdAt: Date;
    brand: { name: string };
  }> = [];

  try {
    const raw = await prisma.post.findMany({
      where: { contentType: "proposal" },
      select: {
        id: true,
        status: true,
        brief: true,
        createdAt: true,
        brand: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    proposals = raw.map((p) => ({
      ...p,
      brief: (p.brief as { title?: string; tier?: string }) ?? {},
    }));
  } catch {
    // DB not connected
  }

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-rocket-muted/10 text-rocket-muted border-rocket-muted/20",
    ready: "bg-blue-50 text-blue-700 border-blue-200",
    sent: "bg-rocket-success/10 text-rocket-success border-rocket-success/20",
  };

  const TIER_LABELS: Record<string, string> = {
    starter: "Starter",
    growth: "Growth",
    scale: "Scale",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="mt-1 text-rocket-muted">
            Build and send campaign proposals to clients.
          </p>
        </div>
        <Link href="/dashboard/proposals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        </Link>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">No proposals yet</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              Create a proposal after running the campaign wizard. It assembles the
              big idea, offer, radio script, and pricing into one clean document.
            </p>
            <Link href="/dashboard/proposals/new" className="mt-4">
              <Button>Build your first proposal</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((p) => (
            <Link key={p.id} href={`/dashboard/proposals/${p.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {p.brief.title ?? "Untitled Proposal"}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${STATUS_COLORS[p.status] ?? ""}`}
                    >
                      {p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-rocket-muted">{p.brand.name}</p>
                  <div className="flex items-center justify-between">
                    {p.brief.tier && (
                      <Badge variant="secondary" className="text-xs">
                        {TIER_LABELS[p.brief.tier] ?? p.brief.tier}
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-rocket-muted">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
