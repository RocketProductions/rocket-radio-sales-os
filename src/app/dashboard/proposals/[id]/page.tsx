import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check } from "lucide-react";
import { ProposalPrintButton } from "@/components/proposals/ProposalPrintButton";

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
  campaign_sessions: { business_name: string; intake_form: Record<string, string> | null; brand_kit_id: string | null } | null;
};

const TIER_DATA: Record<string, { label: string; price: string; monthly: number; features: string[] }> = {
  starter: {
    label: "Starter",
    price: "$497/mo",
    monthly: 497,
    features: [
      "1 radio campaign — we write the script",
      "Every lead gets an instant text back",
      "See every lead in your dashboard",
      "Know who called, who booked, who bought",
      "Weekly email showing your results",
    ],
  },
  growth: {
    label: "Growth",
    price: "$1,497/mo",
    monthly: 1497,
    features: [
      "Everything in Starter, plus:",
      "We build your landing page",
      "We set up and manage your Meta ads",
      "5 automatic follow-ups per lead over 14 days",
      "Monthly performance call with your strategist",
      "ROI reporting — see exactly what your campaign earned",
    ],
  },
  scale: {
    label: "Scale",
    price: "$2,997/mo",
    monthly: 2997,
    features: [
      "Everything in Growth, plus:",
      "Run 2+ campaigns at the same time",
      "We A/B test ads and landing pages",
      "Advanced reporting with source attribution",
      "Dedicated monthly strategy session",
      "Priority support — same-day response",
    ],
  },
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
      campaign_sessions ( business_name, intake_form, brand_kit_id )
    `)
    .eq("id", id)
    .single();

  if (error || !raw) notFound();

  const proposal = raw as unknown as ProposalDetail;
  const tier = proposal.tier ?? "starter";
  const tierData = TIER_DATA[tier] ?? TIER_DATA.starter;
  const businessName = proposal.campaign_sessions?.business_name ?? "Your Business";
  const intake = proposal.campaign_sessions?.intake_form ?? {};
  const avgTicket = parseFloat(intake.avgTicket ?? "0") || 0;
  const industry = intake.industry ?? "";
  const audience = intake.targetAudience ?? "";

  // Fetch brand kit for logo + colors
  let logoUrl: string | null = null;
  let primaryColor = "#1e40af";
  let accentColor = "#c2410c";
  const brandKitId = proposal.campaign_sessions?.brand_kit_id;
  if (brandKitId) {
    const { data: bk } = await supabase
      .from("brand_kits")
      .select("logo_url, primary_color, accent_color")
      .eq("id", brandKitId)
      .single();
    if (bk) {
      const k = bk as { logo_url: string | null; primary_color: string | null; accent_color: string | null };
      logoUrl = k.logo_url;
      if (k.primary_color) primaryColor = k.primary_color;
      if (k.accent_color) accentColor = k.accent_color;
    }
  }

  // ROI projection
  const projectedLeads = 80; // conservative monthly estimate
  const closeRate = 0.20;
  const projectedCustomers = Math.round(projectedLeads * closeRate);
  const projectedRevenue = projectedCustomers * avgTicket;
  const roi = tierData.monthly > 0 ? (projectedRevenue / tierData.monthly) : 0;
  const hasRoi = avgTicket > 0;

  const dateStr = new Date(proposal.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const sequence = [
    { time: "Instant", channel: "Text", desc: "Instant confirmation — we respond before they forget" },
    { time: "Day 1",   channel: "Email", desc: "Personalized follow-up with next steps" },
    { time: "Day 3",   channel: "Text",  desc: "Friendly check-in — keeps you top of mind" },
    { time: "Day 7",   channel: "Email", desc: "Value reminder — why they reached out" },
    { time: "Day 14",  channel: "Text",  desc: "Last touch — soft close or invite to reconnect" },
  ];

  return (
    <>
      {/* Nav — screen only */}
      <div className="mx-auto max-w-3xl flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/proposals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Proposals
            </Button>
          </Link>
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[proposal.status] ?? ""}`}>
            {proposal.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <ProposalPrintButton />
          {proposal.notes && (
            <Badge variant="secondary" className="text-xs">Has internal notes</Badge>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SALES DECK — designed for print and screen
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-3xl space-y-0">

        {/* ── COVER ──────────────────────────────────────────────────── */}
        <section
          className="relative rounded-t-2xl px-10 py-16 text-white overflow-hidden print:rounded-none print:px-8"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="relative z-10">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-10 w-auto mb-8 brightness-0 invert opacity-80" />
            )}
            <p className="text-sm font-medium uppercase tracking-widest opacity-70">Campaign Proposal</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              {proposal.title}
            </h1>
            <p className="mt-3 text-lg opacity-80">
              Prepared for {businessName}
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm opacity-60">
              <span>{dateStr}</span>
              {industry && <span>&middot; {industry}</span>}
              <span>&middot; Powered by Federated Media</span>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
        </section>

        {/* ── THE BIG IDEA ───────────────────────────────────────────── */}
        {proposal.big_idea && (
          <section className="border-x border-rocket-border bg-white px-10 py-10 print:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
              The Big Idea
            </p>
            <p className="mt-3 text-2xl font-bold leading-snug text-rocket-dark">
              {proposal.big_idea}
            </p>
          </section>
        )}

        {/* ── THE OPPORTUNITY ────────────────────────────────────────── */}
        {(proposal.offer_text || audience) && (
          <section className="border-x border-t border-rocket-border bg-slate-50 px-10 py-10 print:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-rocket-muted">The Opportunity</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {proposal.offer_text && (
                <div>
                  <p className="text-sm font-semibold text-rocket-dark">The Offer</p>
                  <p className="mt-1 text-sm leading-relaxed text-rocket-muted">{proposal.offer_text}</p>
                </div>
              )}
              {audience && (
                <div>
                  <p className="text-sm font-semibold text-rocket-dark">Who We&apos;re Reaching</p>
                  <p className="mt-1 text-sm leading-relaxed text-rocket-muted">{audience}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── ROI PROJECTION ─────────────────────────────────────────── */}
        {hasRoi && (
          <section className="border-x border-t border-rocket-border bg-white px-10 py-10 print:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-rocket-muted">Projected Return</p>
            <div className="mt-6 grid grid-cols-4 gap-4 text-center">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-3xl font-bold text-rocket-dark">{projectedLeads}</p>
                <p className="mt-1 text-xs text-rocket-muted">Projected leads/mo</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-3xl font-bold text-rocket-dark">{projectedCustomers}</p>
                <p className="mt-1 text-xs text-rocket-muted">New customers</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-3xl font-bold text-rocket-dark">${projectedRevenue.toLocaleString()}</p>
                <p className="mt-1 text-xs text-rocket-muted">Est. revenue</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: `${accentColor}10` }}>
                <p className="text-3xl font-bold" style={{ color: accentColor }}>{roi.toFixed(1)}x</p>
                <p className="mt-1 text-xs text-rocket-muted">Return on {tierData.price}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-rocket-muted text-center">
              Based on {projectedLeads} leads/mo, {Math.round(closeRate * 100)}% close rate, ${avgTicket.toLocaleString()} avg customer value.
              Conservative estimate — actual results vary.
            </p>
          </section>
        )}

        {/* ── THE CAMPAIGN ───────────────────────────────────────────── */}
        <section className="border-x border-t border-rocket-border bg-white px-10 py-10 print:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-rocket-muted">How It Works</p>
          <div className="mt-6 grid gap-0">
            {[
              { num: "1", title: "Radio Drives Awareness", desc: "Your 30-second spot runs on 95.3 MNC. Listeners hear your offer and remember your name." },
              { num: "2", title: "Landing Page Captures Interest", desc: "When they search or visit your page, a conversion-optimized landing page captures their info." },
              { num: "3", title: "Instant Follow-Up Converts", desc: "Within seconds, they get a text confirming their request. Then a 5-touch sequence keeps you top of mind." },
              { num: "4", title: "You See Every Lead", desc: "Your dashboard shows every lead, every follow-up, and every outcome. You always know what's working." },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 py-4 border-b border-rocket-border last:border-0">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-semibold text-rocket-dark">{step.title}</p>
                  <p className="mt-0.5 text-sm text-rocket-muted">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── RADIO SCRIPT PREVIEW ───────────────────────────────────── */}
        {proposal.radio_script && (
          <section className="border-x border-t border-rocket-border bg-slate-50 px-10 py-10 print:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-rocket-muted">Your Radio Script</p>
            <p className="mt-1 text-xs text-rocket-muted">30-second spot for 95.3 MNC</p>
            <div className="mt-4 rounded-xl border border-rocket-border bg-white p-6 shadow-sm">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-rocket-dark">
                {proposal.radio_script}
              </pre>
            </div>
          </section>
        )}

        {/* ── LANDING PAGE PREVIEW ───────────────────────────────────── */}
        {(proposal.funnel_headline || proposal.funnel_body) && (
          <section className="border-x border-t border-rocket-border bg-white px-10 py-10 print:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-rocket-muted">Your Landing Page</p>
            <div className="mt-4 rounded-xl border border-rocket-border bg-slate-50 p-6 space-y-3">
              {proposal.funnel_headline && (
                <p className="text-xl font-bold text-rocket-dark">{proposal.funnel_headline}</p>
              )}
              {proposal.funnel_body && (
                <p className="text-sm leading-relaxed text-rocket-muted whitespace-pre-line">
                  {proposal.funnel_body}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── FOLLOW-UP SEQUENCE ──────────────────────────────────────── */}
        <section className="border-x border-t border-rocket-border bg-white px-10 py-10 print:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-rocket-muted">Every Lead Gets 5 Follow-Ups</p>
          <p className="mt-1 text-sm text-rocket-muted">Automatic. No action required from you.</p>
          <div className="mt-6 space-y-0">
            {sequence.map((s, i) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b border-rocket-border/50 last:border-0">
                <div className="flex flex-col items-center shrink-0 w-14">
                  <span className="text-xs font-bold text-rocket-dark">{s.time}</span>
                  <span className="text-[10px] text-rocket-muted">{s.channel}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-rocket-dark">{s.desc}</p>
                </div>
                {i === 0 && (
                  <Badge variant="success" className="shrink-0 text-[10px]">Fastest in market</Badge>
                )}
              </div>
            ))}
          </div>
          {proposal.follow_up_summary && (
            <p className="mt-4 text-xs text-rocket-muted italic">{proposal.follow_up_summary}</p>
          )}
        </section>

        {/* ── INVESTMENT ──────────────────────────────────────────────── */}
        <section
          className="border-x border-t px-10 py-10 print:px-8"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60">Your Investment</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-bold">{tierData.price}</p>
                <p className="mt-1 text-sm opacity-70">
                  {tierData.label} plan &middot; Month-to-month &middot; Cancel anytime
                </p>
              </div>
              {hasRoi && (
                <div className="text-right">
                  <p className="text-2xl font-bold">{roi.toFixed(1)}x ROI</p>
                  <p className="text-sm opacity-70">projected return</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {tierData.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-white/90">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-white/60" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <section className="rounded-b-2xl border-x border-t border-b border-rocket-border bg-white px-10 py-8 text-center print:rounded-none print:px-8">
          <p className="text-sm font-semibold text-rocket-dark">Ready to get started?</p>
          <p className="mt-1 text-sm text-rocket-muted">
            Contact your Federated Media representative or visit rocketradiosales.com
          </p>
          <p className="mt-4 text-xs text-rocket-muted">
            &copy; {new Date().getFullYear()} Federated Media &middot; Fort Wayne, Indiana
          </p>
        </section>
      </div>

      {/* ── Internal Notes — screen only ────────────────────────────── */}
      {proposal.notes && (
        <div className="mx-auto max-w-3xl mt-6 rounded-xl border border-dashed border-rocket-border bg-rocket-bg p-4 print:hidden">
          <p className="text-xs font-medium text-rocket-muted">Internal Notes (not shown to client)</p>
          <p className="mt-1 text-sm text-rocket-muted">{proposal.notes}</p>
        </div>
      )}

      {/* ── Actions — screen only ───────────────────────────────────── */}
      <div className="mx-auto max-w-3xl flex gap-3 mt-6 pb-8 print:hidden">
        <ProposalPrintButton />
        <Link href="/dashboard/proposals" className="flex-1">
          <Button variant="ghost" className="w-full">Back to proposals</Button>
        </Link>
      </div>
    </>
  );
}
