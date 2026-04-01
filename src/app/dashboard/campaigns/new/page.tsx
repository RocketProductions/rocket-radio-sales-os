import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { CampaignWizard, type InitialSessionData } from "@/components/campaigns/CampaignWizard";
import type { AssetSeed, AssetStatus } from "@/hooks/useAsset";
import type { BrandKit } from "@/ai/modes/brandAnalysis";

interface PageProps {
  searchParams: Promise<{ session?: string }>;
}

// ── Load a saved session from Supabase for resume ─────────────────────────────

async function loadSession(sessionId: string, tenantId: string, userId: string, userRole: string): Promise<InitialSessionData | null> {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch session row
    const { data: session, error } = await supabase
      .from("campaign_sessions")
      .select("session_id, business_name, brand_kit_id, lp_slug, lp_live, intake_form, tenant_id, user_id")
      .eq("session_id", sessionId)
      .single();

    if (error || !session) return null;

    const s = session as {
      session_id: string;
      business_name: string;
      brand_kit_id: string | null;
      lp_slug: string | null;
      lp_live: boolean;
      intake_form: Record<string, string> | null;
      tenant_id: string | null;
      user_id: string | null;
    };

    // Ownership check
    const isSuperAdmin = userRole === "super_admin";
    if (!isSuperAdmin && s.tenant_id !== tenantId && s.user_id !== userId) return null;

    // Fetch assets — keep latest per type
    const { data: assets } = await supabase
      .from("campaign_assets")
      .select("id, asset_type, status, content, edited_content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    const latestByType: Record<string, { id: string; asset_type: string; status: string; content: unknown; edited_content: unknown }> = {};
    for (const asset of assets ?? []) {
      const a = asset as { id: string; asset_type: string; status: string; content: unknown; edited_content: unknown };
      if (!latestByType[a.asset_type]) latestByType[a.asset_type] = a;
    }

    function toSeed<T>(type: string): AssetSeed<T> | null {
      const a = latestByType[type];
      if (!a) return null;
      const data = (a.edited_content ?? a.content) as T;
      // DB stores "draft" for freshly-saved assets; map to "saved" for the UI
      const statusMap: Record<string, AssetStatus> = {
        draft:    "saved",
        saved:    "saved",
        edited:   "edited",
        approved: "approved",
      };
      const status: AssetStatus = statusMap[a.status] ?? "saved";
      return { data, dbId: a.id, status };
    }

    // Fetch brand kit
    let brandKit: BrandKit | null = null;
    let bkTrackingPhone = "";
    let bkSmsKeyword = "";
    if (s.brand_kit_id) {
      const { data: kit } = await supabase
        .from("brand_kits")
        .select("business_description, tagline, logo_url, primary_color, secondary_color, accent_color, font_headline, font_body, tone_words, key_phrases, target_audience, unique_value_prop, industry, tracking_phone, meta_pixel_id, sms_keyword")
        .eq("id", s.brand_kit_id)
        .single();

      if (kit) {
        const k = kit as {
          business_description: string; tagline: string | null; logo_url: string | null;
          primary_color: string | null; secondary_color: string | null; accent_color: string | null;
          font_headline: string | null; font_body: string | null;
          tone_words: string[]; key_phrases: string[];
          target_audience: string; unique_value_prop: string; industry: string;
          tracking_phone: string | null; meta_pixel_id: string | null; sms_keyword: string | null;
        };
        brandKit = {
          businessDescription: k.business_description,
          tagline:             k.tagline,
          logoUrl:             k.logo_url,
          primaryColor:        k.primary_color,
          secondaryColor:      k.secondary_color,
          accentColor:         k.accent_color,
          fontSuggestions:     { headline: k.font_headline, body: k.font_body },
          toneWords:           k.tone_words ?? [],
          keyPhrases:          k.key_phrases ?? [],
          targetAudience:      k.target_audience,
          uniqueValueProp:     k.unique_value_prop,
          industry:            k.industry,
        };
        bkTrackingPhone = k.tracking_phone ?? "";
        bkSmsKeyword = k.sms_keyword ?? "";
      }
    }

    const liveUrl = s.lp_slug && s.lp_live
      ? `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocket-radio-sales-os.vercel.app"}/lp/${s.lp_slug}`
      : null;

    return {
      sessionId:    s.session_id,
      businessName: s.business_name,
      brandKit,
      brandKitId:   s.brand_kit_id,
      trackingPhone: bkTrackingPhone,
      smsKeyword:    bkSmsKeyword,
      intakeForm:   s.intake_form ?? {},
      brief:        toSeed("brief"),
      script:       toSeed("radio-script"),
      funnel:       toSeed("funnel-copy"),
      followUp:     toSeed("follow-up-sequence"),
      lpSlug:       s.lp_slug,
      liveUrl,
    };
  } catch {
    return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function NewCampaignPage({ searchParams }: PageProps) {
  const { session: resumeId } = await searchParams;
  const headersList = await headers();
  const tenantId  = headersList.get("x-tenant-id") ?? "";
  const userId    = headersList.get("x-user-id")   ?? "";
  const userRole  = headersList.get("x-user-role") ?? "rep";

  const initialData = resumeId
    ? await loadSession(resumeId, tenantId, userId, userRole)
    : undefined;

  const isResume = !!initialData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isResume ? `Resume — ${initialData!.businessName}` : "New Campaign"}
        </h1>
        <p className="mt-1 text-rocket-muted">
          {isResume
            ? "Pick up where you left off. All saved assets are loaded below."
            : "Enter the business details and let AI build your campaign strategy."}
        </p>
      </div>
      <CampaignWizard initialData={initialData} />
    </div>
  );
}
