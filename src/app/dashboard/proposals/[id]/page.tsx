import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Phone, Mail, ArrowRight } from "lucide-react";
import { ProposalPrintButton } from "@/components/proposals/ProposalPrintButton";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

type ProposalDetail = {
  id: string; title: string; status: string; tier: string;
  big_idea: string | null; offer_text: string | null; radio_script: string | null;
  funnel_headline: string | null; funnel_body: string | null;
  follow_up_summary: string | null; notes: string | null;
  created_at: string; session_id: string | null;
  campaign_sessions: { business_name: string; intake_form: Record<string, string> | null; brand_kit_id: string | null } | null;
};

const TIERS: Record<string, { label: string; price: string; monthly: number; features: string[] }> = {
  starter: { label: "Starter", price: "$497", monthly: 497, features: ["1 radio campaign — we write the script", "Every lead gets an instant text back", "See every lead in your dashboard", "Weekly results email"] },
  growth: { label: "Growth", price: "$1,497", monthly: 1497, features: ["Everything in Starter", "We build your landing page", "We manage your Meta ads", "5 automatic follow-ups per lead", "Monthly strategy call", "ROI reporting"] },
  scale: { label: "Scale", price: "$2,997", monthly: 2997, features: ["Everything in Growth", "2+ simultaneous campaigns", "A/B testing", "Dedicated monthly strategy", "Priority support"] },
};

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: raw, error } = await supabase.from("proposals")
    .select("id, title, status, tier, big_idea, offer_text, radio_script, funnel_headline, funnel_body, follow_up_summary, notes, created_at, session_id, campaign_sessions ( business_name, intake_form, brand_kit_id )")
    .eq("id", id).single();

  if (error || !raw) notFound();

  const p = raw as unknown as ProposalDetail;
  const tier = TIERS[p.tier ?? "growth"] ?? TIERS.growth;
  const biz = p.campaign_sessions?.business_name ?? "Your Business";
  const intake = p.campaign_sessions?.intake_form ?? {};
  const avgTicket = parseFloat(intake.avgTicket ?? "0") || 0;

  // Brand
  let logoUrl: string | null = null;
  const bkId = p.campaign_sessions?.brand_kit_id;
  if (bkId) {
    const { data: bk } = await supabase.from("brand_kits").select("logo_url").eq("id", bkId).single();
    if (bk) logoUrl = (bk as { logo_url: string | null }).logo_url;
  }

  // ROI
  const leads = 80;
  const customers = Math.round(leads * 0.2);
  const revenue = customers * avgTicket;
  const roi = tier.monthly > 0 ? revenue / tier.monthly : 0;

  const date = new Date(p.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      {/* Nav — screen only */}
      <div className="mx-auto max-w-4xl flex items-center justify-between mb-4 print:hidden">
        <Link href="/dashboard/proposals">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Proposals</Button>
        </Link>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="text-xs">{p.status}</Badge>
          <ProposalPrintButton />
        </div>
      </div>

      {/* ═══ DECK ═══ */}
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl shadow-2xl print:shadow-none print:rounded-none">

        {/* ── 1. COVER ─────────────────────────────────────── */}
        <section className="relative bg-[#0B1D3A] px-12 py-20 md:py-28 text-white overflow-hidden">
          <div className="relative z-10">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-8 w-auto mb-10 brightness-0 invert opacity-60" />
            )}
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#D4A853]">Campaign Proposal</p>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight max-w-xl">
              {p.title}
            </h1>
            <div className="mt-8 flex items-center gap-3 text-sm text-white/50">
              <span>Prepared for {biz}</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>{date}</span>
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#D4A853]/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4A853] via-[#D4A853]/40 to-transparent" />
        </section>

        {/* ── 2. THE PROBLEM ──────────────────────────────── */}
        <section className="bg-white px-12 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">The Problem</p>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold leading-tight text-[#0B1D3A] max-w-lg">
            You spend money on advertising. Can you prove it works?
          </h2>
          <p className="mt-6 text-lg text-[#5C6370] leading-relaxed max-w-xl">
            Leads fall through the cracks. Nobody follows up fast enough.
            The competitor who calls back first wins the job.
          </p>
          <div className="mt-10 inline-flex items-center gap-4 rounded-2xl bg-[#F5F3EF] px-8 py-5">
            <span className="text-5xl font-bold text-[#0B1D3A]">73%</span>
            <span className="text-sm text-[#5C6370] max-w-[200px] leading-snug">
              of leads go to the business that responds within 5 minutes
            </span>
          </div>
        </section>

        {/* ── 3. THE BIG IDEA ─────────────────────────────── */}
        {p.big_idea && (
          <section className="bg-[#0B1D3A] px-12 py-16 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">The Big Idea</p>
            <h2 className="mt-6 text-3xl md:text-5xl font-bold leading-tight text-white max-w-2xl">
              {p.big_idea}
            </h2>
          </section>
        )}

        {/* ── 4. HOW IT WORKS ─────────────────────────────── */}
        <section className="bg-white px-12 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">How It Works</p>
          <h2 className="mt-4 text-2xl md:text-3xl font-bold text-[#0B1D3A]">The 4-Part Revenue System</h2>
          <div className="mt-10 grid gap-0 sm:grid-cols-4">
            {[
              { num: "01", title: "Radio Drives\nAwareness", sub: "Your spot runs on 95.3 MNC" },
              { num: "02", title: "Landing Page\nCaptures Interest", sub: "Every visitor, one simple form" },
              { num: "03", title: "Instant Follow-Up\nConverts", sub: "Text in 60 seconds + 4 more" },
              { num: "04", title: "Dashboard\nShows Results", sub: "Every lead, every close" },
            ].map((s, i) => (
              <div key={i} className="relative py-6 pr-6">
                <span className="text-[64px] font-bold leading-none text-[#F5F3EF]">{s.num}</span>
                <p className="mt-2 text-sm font-semibold text-[#0B1D3A] whitespace-pre-line leading-snug">{s.title}</p>
                <p className="mt-1 text-xs text-[#5C6370]">{s.sub}</p>
                {i < 3 && (
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E5E1D8] hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. RADIO SCRIPT ─────────────────────────────── */}
        {p.radio_script && (
          <section className="bg-[#F5F3EF] px-12 py-16 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">Your Radio Script</p>
            <p className="mt-1 text-xs text-[#5C6370]">30-second spot for 95.3 MNC</p>
            <div className="mt-6 rounded-2xl bg-white p-8 md:p-10 shadow-sm border border-[#E5E1D8]">
              <div className="border-l-4 border-[#D4A853] pl-6">
                <p className="text-base md:text-lg leading-relaxed text-[#0B1D3A] whitespace-pre-line">
                  {p.radio_script}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── 6. LANDING PAGE ─────────────────────────────── */}
        {(p.funnel_headline || p.funnel_body) && (
          <section className="bg-white px-12 py-16 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">Your Landing Page</p>
            <p className="mt-1 text-xs text-[#5C6370]">Built and ready to go live</p>
            <div className="mt-6 rounded-2xl bg-[#F5F3EF] border border-[#E5E1D8] overflow-hidden">
              <div className="bg-[#0B1D3A] px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                </div>
                <div className="flex-1 rounded bg-white/10 px-3 py-0.5 text-[10px] text-white/40 font-mono">
                  yourbusiness.com/offer
                </div>
              </div>
              <div className="p-8">
                {p.funnel_headline && (
                  <p className="text-2xl font-bold text-[#0B1D3A]">{p.funnel_headline}</p>
                )}
                {p.funnel_body && (
                  <p className="mt-3 text-sm text-[#5C6370] leading-relaxed whitespace-pre-line line-clamp-4">
                    {p.funnel_body}
                  </p>
                )}
                <div className="mt-4 inline-block rounded-lg bg-[#D4A853] px-6 py-2 text-sm font-semibold text-white">
                  Get My Free Estimate
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── 7. FOLLOW-UP ────────────────────────────────── */}
        <section className="bg-[#0B1D3A] px-12 py-16 md:py-20 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">Automatic Follow-Up</p>
          <h2 className="mt-4 text-2xl md:text-3xl font-bold">Every lead gets 5 touchpoints</h2>
          <p className="mt-2 text-sm text-white/50">No action required from you. We handle it all.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            {[
              { time: "Instant", label: "Text", highlight: true },
              { time: "Day 1", label: "Email", highlight: false },
              { time: "Day 3", label: "Text", highlight: false },
              { time: "Day 7", label: "Email", highlight: false },
              { time: "Day 14", label: "Text", highlight: false },
            ].map((s, i) => (
              <div
                key={i}
                className={`flex-1 min-w-[100px] rounded-xl px-4 py-4 text-center ${
                  s.highlight ? "bg-[#D4A853] text-[#0B1D3A]" : "bg-white/5 text-white"
                }`}
              >
                <p className={`text-lg font-bold ${s.highlight ? "" : "text-white"}`}>{s.time}</p>
                <p className={`text-xs mt-0.5 ${s.highlight ? "text-[#0B1D3A]/70" : "text-white/50"}`}>{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#D4A853]">Fastest response time in the market</p>
        </section>

        {/* ── 8. ROI ──────────────────────────────────────── */}
        {avgTicket > 0 && (
          <section className="bg-white px-12 py-16 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">Projected Return</p>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-5xl font-bold text-[#0B1D3A]">{leads}+</p>
                <p className="mt-1 text-sm text-[#5C6370]">leads per month</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-[#0B1D3A]">{customers}</p>
                <p className="mt-1 text-sm text-[#5C6370]">new customers</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-[#0B1D3A]">${revenue.toLocaleString()}</p>
                <p className="mt-1 text-sm text-[#5C6370]">estimated revenue</p>
              </div>
              <div>
                <p className="text-5xl font-bold text-[#D4A853]">{roi.toFixed(1)}x</p>
                <p className="mt-1 text-sm text-[#5C6370]">return on {tier.price}/mo</p>
              </div>
            </div>
            <p className="mt-6 text-xs text-[#5C6370]">
              Based on {leads} leads, 20% close rate, ${avgTicket.toLocaleString()} avg customer value. Conservative estimate.
            </p>
          </section>
        )}

        {/* ── 9. INVESTMENT ───────────────────────────────── */}
        <section className="bg-[#F5F3EF] px-12 py-16 md:py-20">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">Your Investment</p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl md:text-6xl font-bold text-[#0B1D3A]">{tier.price}</span>
                <span className="text-lg text-[#5C6370]">/mo</span>
              </div>
              <p className="mt-2 text-sm text-[#5C6370]">{tier.label} plan &middot; Month-to-month &middot; Cancel anytime</p>
            </div>
            <div className="space-y-2.5">
              {tier.features.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#D4A853]" />
                  <span className="text-sm text-[#0B1D3A]">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. CTA ─────────────────────────────────────── */}
        <section className="bg-[#0B1D3A] px-12 py-16 md:py-20 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A853]">Next Step</p>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold max-w-lg mx-auto leading-tight">
            Your campaign is built. Ready when you are.
          </h2>
          <p className="mt-4 text-white/50 max-w-md mx-auto">
            Your radio script, landing page, and follow-up sequence are ready to go live.
            All we need is your go-ahead.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> (260) 447-5511</span>
            <span className="hidden sm:block h-1 w-1 rounded-full bg-white/30" />
            <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> strategy@federatedmedia.com</span>
          </div>
          <div className="mt-10 h-px bg-gradient-to-r from-transparent via-[#D4A853]/30 to-transparent" />
          <p className="mt-6 text-xs text-white/30">
            &copy; {new Date().getFullYear()} Federated Media &middot; Fort Wayne, Indiana
          </p>
        </section>
      </div>

      {/* Internal notes — screen only */}
      {p.notes && (
        <div className="mx-auto max-w-4xl mt-6 rounded-xl border border-dashed border-rocket-border bg-rocket-bg p-4 print:hidden">
          <p className="text-xs font-medium text-rocket-muted">Internal Notes (not shown to client)</p>
          <p className="mt-1 text-sm text-rocket-muted">{p.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mx-auto max-w-4xl flex gap-3 mt-6 pb-8 print:hidden">
        <ProposalPrintButton />
        <Link href="/dashboard/proposals" className="flex-1">
          <Button variant="ghost" className="w-full">Back to proposals</Button>
        </Link>
      </div>
    </>
  );
}
