import Link from "next/link";
import { Rocket, Radio, Globe, Zap, BarChart2, Check, ArrowRight, Phone, Mail } from "lucide-react";

const STEPS = [
  { num: "01", icon: Radio, title: "We Build Your Campaign", desc: "Custom radio script, landing page, and follow-up sequence — all done for you in 48 hours." },
  { num: "02", icon: Zap, title: "We Respond to Every Lead", desc: "Every person who fills out your form gets a text within 60 seconds. Then 4 more follow-ups over 14 days." },
  { num: "03", icon: BarChart2, title: "You See the Results", desc: "Log in to your dashboard. See every lead, every response, every booking. Know exactly what your radio campaign earned." },
];

const TIERS = [
  {
    label: "Starter", price: "$497", period: "/mo",
    pitch: "We text every lead within 60 seconds",
    features: ["1 radio campaign — we write the script", "Every lead gets an instant text back", "See every lead in your dashboard", "Know who called, who booked, who bought", "Weekly email showing your results"],
    cta: "Get Started",
  },
  {
    label: "Growth", price: "$1,497", period: "/mo", popular: true,
    pitch: "We handle everything — you just check your leads",
    features: ["Everything in Starter, plus:", "We build your landing page", "We set up and manage your Meta ads", "5 automatic follow-ups per lead over 14 days", "Monthly performance call with your strategist", "ROI reporting — see exactly what your campaign earned"],
    cta: "Get Started",
  },
  {
    label: "Scale", price: "$2,997", period: "/mo",
    pitch: "Multiple campaigns — we optimize what works",
    features: ["Everything in Growth, plus:", "Run 2+ campaigns at the same time", "We A/B test ads and landing pages", "Advanced reporting with source attribution", "Dedicated monthly strategy session", "Priority support — same-day response"],
    cta: "Get Started",
  },
];

const STATS = [
  { value: "60", suffix: "sec", label: "Lead response time" },
  { value: "80", suffix: "+", label: "Leads per month" },
  { value: "5", suffix: "x", label: "Average client ROI" },
  { value: "50K", suffix: "+", label: "Listeners reached" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── NAV ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#E5E1D8] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B1D3A]">
              <Rocket className="h-4.5 w-4.5 text-[#D4A853]" />
            </div>
            <span className="text-base font-bold text-[#0B1D3A]">Rocket Radio</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-[#5C6370] hover:text-[#0B1D3A] transition-colors">
              Sign in
            </Link>
            <Link
              href="/get-started"
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[#D4A853] px-5 py-2.5 text-sm font-semibold text-[#0B1D3A] shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-[0.98]"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0B1D3A] px-6 py-20 md:py-32">
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#D4A853]">
              Federated Media &middot; 95.3 MNC
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl">
              Turn radio listeners into paying customers
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/60 max-w-xl">
              We create your radio campaign, build your landing page, and text every lead
              within 60 seconds. You just check your dashboard and watch the appointments roll in.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4A853] px-8 py-4 text-base font-bold text-[#0B1D3A] shadow-lg shadow-[#D4A853]/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.98]"
              >
                Get Your Free Campaign Preview <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white/80 transition-colors hover:bg-white/5"
              >
                See How It Works
              </a>
            </div>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#D4A853]/5 to-transparent" />
        <div className="absolute -bottom-1 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className="border-b border-[#E5E1D8] bg-[#F5F3EF]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-0 md:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={i} className="px-6 py-8 text-center border-r border-[#E5E1D8] last:border-0 md:[&:nth-child(2)]:border-r">
              <p className="text-4xl font-bold text-[#0B1D3A]">
                {s.value}<span className="text-[#D4A853]">{s.suffix}</span>
              </p>
              <p className="mt-1 text-sm text-[#5C6370]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">The Problem</p>
          <h2 className="mt-4 text-3xl font-bold text-[#0B1D3A] md:text-5xl leading-tight">
            You spend money on advertising. Can you prove it works?
          </h2>
          <p className="mt-6 text-lg text-[#5C6370] leading-relaxed max-w-2xl mx-auto">
            Most local businesses run radio ads and hope for the best. Leads call but nobody tracks them.
            Follow-up is slow. The competitor who responds first wins the job.
          </p>
          <div className="mt-10 inline-flex items-center gap-5 rounded-2xl bg-[#F5F3EF] px-10 py-6">
            <span className="text-6xl font-bold text-[#0B1D3A]">73%</span>
            <span className="text-left text-sm text-[#5C6370] max-w-[220px] leading-snug">
              of leads go to the business that responds within 5 minutes
            </span>
          </div>
        </div>
      </section>

      {/* ── THE SOLUTION ─────────────────────────────────────── */}
      <section className="bg-[#0B1D3A] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">The Solution</p>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl leading-tight">
              The 4-Part Revenue System
            </h2>
            <p className="mt-4 text-lg text-white/50 max-w-2xl mx-auto">
              Radio drives awareness. Your landing page captures interest.
              Instant follow-up converts. Your dashboard proves the ROI.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-4">
            {[
              { icon: Radio, label: "Radio Drives\nAwareness", sub: "Your 30-second spot on 95.3 MNC reaches 50,000+ listeners" },
              { icon: Globe, label: "Landing Page\nCaptures Interest", sub: "Every visitor sees your offer and fills out a simple form" },
              { icon: Zap, label: "Instant Follow-Up\nConverts", sub: "Text within 60 seconds + 4 more follow-ups over 14 days" },
              { icon: BarChart2, label: "Dashboard\nShows Results", sub: "See every lead, every response, every close in real time" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl bg-white/5 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A853]/10">
                  <s.icon className="h-6 w-6 text-[#D4A853]" />
                </div>
                <p className="mt-4 text-sm font-semibold text-white whitespace-pre-line leading-snug">{s.label}</p>
                <p className="mt-2 text-xs text-white/40 leading-relaxed">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">How It Works</p>
            <h2 className="mt-4 text-3xl font-bold text-[#0B1D3A] md:text-4xl">Three steps. Zero hassle.</h2>
          </div>
          <div className="mt-16 space-y-16">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-6 md:gap-10 items-start">
                <div className="shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B1D3A]">
                    <step.icon className="h-6 w-6 text-[#D4A853]" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#D4A853]">Step {step.num}</p>
                  <h3 className="mt-2 text-xl font-bold text-[#0B1D3A] md:text-2xl">{step.title}</h3>
                  <p className="mt-2 text-base text-[#5C6370] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section className="bg-[#F5F3EF] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">Pricing</p>
            <h2 className="mt-4 text-3xl font-bold text-[#0B1D3A] md:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-3 text-base text-[#5C6370]">Month-to-month. No long-term contract. Cancel anytime.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.label}
                className={`relative rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-lg ${
                  t.popular ? "ring-2 ring-[#D4A853] shadow-lg" : "border border-[#E5E1D8]"
                }`}
              >
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4A853] px-4 py-1 text-xs font-bold text-[#0B1D3A]">
                    Most Popular
                  </div>
                )}
                <p className="text-sm font-semibold text-[#5C6370]">{t.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#0B1D3A]">{t.price}</span>
                  <span className="text-base text-[#5C6370]">{t.period}</span>
                </div>
                <p className="mt-2 text-sm text-[#5C6370]">{t.pitch}</p>
                <div className="mt-6 space-y-3">
                  {t.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#D4A853]" />
                      <span className="text-sm text-[#0B1D3A]">{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/get-started"
                  className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${
                    t.popular
                      ? "bg-[#D4A853] text-[#0B1D3A] shadow-sm hover:shadow-md"
                      : "border-2 border-[#0B1D3A] text-[#0B1D3A] hover:bg-[#0B1D3A] hover:text-white"
                  }`}
                >
                  {t.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="bg-[#0B1D3A] px-6 py-20 md:py-28 text-center">
        <div className="mx-auto max-w-2xl">
          <Rocket className="h-8 w-8 text-[#D4A853] mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white md:text-5xl leading-tight">
            Ready to prove your radio works?
          </h2>
          <p className="mt-4 text-lg text-white/50">
            Get a free custom campaign preview — radio script, landing page, and ROI projection —
            built for your business in 48 hours.
          </p>
          <Link
            href="/get-started"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[#D4A853] px-10 py-4 text-base font-bold text-[#0B1D3A] shadow-lg shadow-[#D4A853]/20 transition-all hover:shadow-xl hover:brightness-105 active:scale-[0.98]"
          >
            Get Your Free Campaign Preview <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-white/40">
            <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> (260) 447-5511</span>
            <span className="hidden sm:block h-1 w-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> strategy@federatedmedia.com</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E1D8] bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-[#D4A853]" />
            <span className="text-sm font-semibold text-[#0B1D3A]">Rocket Radio</span>
            <span className="text-xs text-[#5C6370]">&middot; Powered by Federated Media</span>
          </div>
          <div className="flex gap-6 text-xs text-[#5C6370]">
            <Link href="/privacy" className="hover:text-[#0B1D3A] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#0B1D3A] transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-[#0B1D3A] transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
