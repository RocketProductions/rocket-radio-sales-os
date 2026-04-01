import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NewProposalClient, type SessionOption, type PrefilledData } from "@/components/proposals/NewProposalClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ session?: string }>;
}

// ── Extract content from a saved campaign asset ────────────────────────────────
function pickContent(asset: { content: unknown; edited_content: unknown } | null): Record<string, unknown> {
  if (!asset) return {};
  const raw = asset.edited_content ?? asset.content;
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

export default async function NewProposalPage({ searchParams }: PageProps) {
  const { session: sessionParam } = await searchParams;

  const headersList = await headers();
  const tenantId  = headersList.get("x-tenant-id") ?? "";
  const userRole  = headersList.get("x-user-role") ?? "";
  const isSuperAdmin = userRole === "super_admin";

  const supabase = getSupabaseAdmin();

  // ── Load all active sessions for the picker ────────────────────────────────
  let sessionsQuery = supabase
    .from("campaign_sessions")
    .select("session_id, business_name")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (!isSuperAdmin && tenantId) {
    sessionsQuery = sessionsQuery.eq("tenant_id", tenantId);
  }

  const { data: rawSessions } = await sessionsQuery;
  const sessions = (rawSessions ?? []) as SessionOption[];

  // ── Pre-fill from campaign assets if ?session= provided ───────────────────
  let prefilled: PrefilledData = {
    title:           "",
    bigIdea:         "",
    offerText:       "",
    radioScript:     "",
    funnelHeadline:  "",
    funnelBody:      "",
    followUpSummary: "",
  };
  let selectedSessionId = sessionParam ?? "";

  if (sessionParam) {
    // Fetch the most recent asset of each relevant type for this session
    const { data: rawAssets } = await supabase
      .from("campaign_assets")
      .select("id, asset_type, content, edited_content")
      .eq("session_id", sessionParam)
      .in("asset_type", ["brief", "radio-script", "funnel-copy", "follow-up-sequence"])
      .order("created_at", { ascending: false });

    // Keep latest per type
    type RawAsset = { id: string; asset_type: string; content: unknown; edited_content: unknown };
    const assets = (rawAssets ?? []) as unknown as RawAsset[];
    const latest: Record<string, RawAsset> = {};
    for (const a of assets) {
      if (!latest[a.asset_type]) latest[a.asset_type] = a;
    }

    const intake    = pickContent(latest["brief"] ?? null);
    const script    = pickContent(latest["radio-script"] ?? null);
    const funnel    = pickContent(latest["funnel-copy"] ?? null);
    const followUp  = pickContent(latest["follow-up-sequence"] ?? null);

    // Derive the session's business name for the default title
    const session = sessions.find((s) => s.session_id === sessionParam);
    const bizName = session?.business_name ?? "";

    // Build offer text from intake data
    const offerDef = intake.offerDefinition as { offer?: string } | undefined;

    // Build follow-up summary from first two messages
    let followUpSummary = "";
    if (Array.isArray(followUp.messages) && followUp.messages.length > 0) {
      const first = followUp.messages[0] as { timing?: string; channel?: string; body?: string };
      followUpSummary = `We follow up with every lead automatically: instant ${first.channel ?? "text"}, then day 1, 3, 7, and 14 touchpoints — so no lead goes cold.`;
    }

    // Build funnel body from bodyCopy array or subheadline
    let funnelBody = "";
    if (Array.isArray(funnel.bodyCopy)) {
      funnelBody = (funnel.bodyCopy as string[]).slice(0, 2).join("\n\n");
    } else if (funnel.subheadline) {
      funnelBody = funnel.subheadline as string;
    }

    prefilled = {
      title:           bizName ? `${bizName} — Campaign Proposal` : "",
      bigIdea:         (intake.bigIdea as string) ?? "",
      offerText:       (offerDef?.offer as string) ?? "",
      radioScript:     (script.script as string) ?? "",
      funnelHeadline:  (funnel.headline as string) ?? "",
      funnelBody,
      followUpSummary,
    };
  }

  return (
    <NewProposalClient
      key={selectedSessionId || "__empty__"}
      sessions={sessions}
      selectedSessionId={selectedSessionId}
      prefilled={prefilled}
    />
  );
}
