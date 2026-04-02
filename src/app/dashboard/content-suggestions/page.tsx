import { headers } from "next/headers";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuggestionActions } from "@/components/content/SuggestionActions";
import { Sparkles, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

type ContentSuggestion = {
  id: string;
  landing_page_id: string;
  session_id: string | null;
  suggestion_type: string;
  original_text: string;
  suggested_text: string;
  reasoning: string;
  status: string;
  created_at: string;
};

type LandingPageInfo = {
  id: string;
  business_name: string | null;
  slug: string;
};

type EnrichedSuggestion = ContentSuggestion & {
  business_name: string;
  slug: string;
};

// ── Badge variant by suggestion type ─────────────────────────────────────────

function typeBadgeVariant(type: string) {
  switch (type) {
    case "headline":
      return "default" as const;
    case "body":
      return "secondary" as const;
    case "cta":
      return "warning" as const;
    case "form":
      return "success" as const;
    default:
      return "outline" as const;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ContentSuggestionsPage() {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id") ?? "";

  const supabase = getSupabaseAdmin();

  // Get session IDs belonging to this tenant
  const { data: sessions } = tenantId
    ? await supabase
        .from("campaign_sessions")
        .select("session_id")
        .eq("tenant_id", tenantId)
    : { data: [] };

  const sessionIds = (sessions ?? []).map(
    (s: { session_id: string }) => s.session_id,
  );

  // Fetch all suggestions (pending + applied + dismissed)
  let allSuggestions: ContentSuggestion[] = [];

  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from("content_suggestions")
      .select(
        "id, landing_page_id, session_id, suggestion_type, original_text, suggested_text, reasoning, status, created_at",
      )
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false });

    allSuggestions = (data ?? []) as ContentSuggestion[];
  }

  // Join landing page info
  const lpIds = [
    ...new Set(allSuggestions.map((s) => s.landing_page_id)),
  ];

  const lpMap = new Map<string, LandingPageInfo>();
  if (lpIds.length > 0) {
    const { data: lps } = await supabase
      .from("landing_pages")
      .select("id, business_name, slug")
      .in("id", lpIds);

    if (lps) {
      for (const lp of lps as LandingPageInfo[]) {
        lpMap.set(lp.id, lp);
      }
    }
  }

  const enrich = (s: ContentSuggestion): EnrichedSuggestion => {
    const lp = lpMap.get(s.landing_page_id);
    return {
      ...s,
      business_name: lp?.business_name ?? "Unknown Business",
      slug: lp?.slug ?? "",
    };
  };

  const pending = allSuggestions
    .filter((s) => s.status === "pending")
    .map(enrich);

  const resolved = allSuggestions
    .filter((s) => s.status === "applied" || s.status === "dismissed")
    .map(enrich);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Suggestions"
        subtitle="AI-recommended improvements for your landing pages"
      />

      {/* ── Pending suggestions ────────────────────────────────────────────── */}
      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              There are no pending content suggestions right now. Check back
              later or run a new optimization pass.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      )}

      {/* ── Resolved suggestions (collapsed) ───────────────────────────────── */}
      {resolved.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-rocket-muted hover:text-rocket-dark transition-colors select-none">
            {resolved.length} resolved suggestion
            {resolved.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-4 space-y-4">
            {resolved.map((s) => (
              <Card
                key={s.id}
                className="opacity-60"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {s.business_name}
                      </span>
                      <Badge variant={typeBadgeVariant(s.suggestion_type)}>
                        {s.suggestion_type}
                      </Badge>
                      <Badge
                        variant={
                          s.status === "applied" ? "success" : "secondary"
                        }
                      >
                        {s.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-rocket-muted shrink-0">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── Suggestion Card ──────────────────────────────────────────────────────────

function SuggestionCard({ suggestion }: { suggestion: EnrichedSuggestion }) {
  const s = suggestion;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-base truncate">
              {s.business_name}
            </CardTitle>
            <Badge variant={typeBadgeVariant(s.suggestion_type)}>
              {s.suggestion_type}
            </Badge>
          </div>
          <span className="text-xs text-rocket-muted shrink-0">
            {new Date(s.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Original */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rocket-muted mb-1">
            Original
          </p>
          <p className="text-sm text-rocket-muted">{s.original_text}</p>
        </div>

        {/* Suggested */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rocket-muted mb-1">
            Suggested
          </p>
          <p className="text-sm font-semibold text-rocket-dark">
            {s.suggested_text}
          </p>
        </div>

        {/* Reasoning */}
        {s.reasoning && (
          <p className="text-sm italic text-rocket-muted">{s.reasoning}</p>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between pt-1">
          <SuggestionActions suggestionId={s.id} />
          {s.slug && (
            <Link
              href={`/lp/${s.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-rocket-blue hover:underline"
            >
              View live page
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
