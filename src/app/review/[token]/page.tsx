import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ReviewClient } from "@/components/review/ReviewClient";

interface Asset {
  id: string;
  asset_type: string;
  content: Record<string, unknown>;
  edited_content?: Record<string, unknown> | null;
  status: string;
}

interface ReviewSession {
  id: string;
  token: string;
  status: string;
  business_name: string | null;
  rep_message: string | null;
  client_notes: string | null;
  asset_ids: string[];
  expires_at: string;
  viewed_at: string | null;
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();

  // Fetch session
  const { data: session, error } = await supabase
    .from("review_sessions")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !session) notFound();

  const s = session as ReviewSession;

  // Check expiry
  if (new Date(s.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">This review link has expired</h1>
          <p className="text-slate-500">Please contact your Federated Media rep for a new link.</p>
        </div>
      </div>
    );
  }

  // Mark viewed
  if (!s.viewed_at) {
    await supabase
      .from("review_sessions")
      .update({ viewed_at: new Date().toISOString(), status: "viewed" })
      .eq("token", token);
  }

  // Fetch assets
  let assets: Asset[] = [];
  if (s.asset_ids.length > 0) {
    const { data } = await supabase
      .from("campaign_assets")
      .select("id, asset_type, content, edited_content, status")
      .in("id", s.asset_ids);
    assets = (data ?? []) as Asset[];
  }

  // Sort by asset type order
  const ORDER = ["brief", "radio-script", "funnel-copy", "follow-up-sequence"];
  assets.sort((a, b) => ORDER.indexOf(a.asset_type) - ORDER.indexOf(b.asset_type));

  return (
    <ReviewClient
      token={token}
      session={s}
      assets={assets}
    />
  );
}
