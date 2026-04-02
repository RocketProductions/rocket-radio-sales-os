import Link from "next/link";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  Radio, Globe, Zap, BarChart2, Check, ArrowRight, Phone, Mail,
} from "lucide-react";

const STEPS = [
  { num: "01", icon: Radio, title: "We Build Your Campaign", desc: "Custom radio script, landing page, and follow-up sequence — all done for you in 48 hours." },
  { num: "02", icon: Zap, title: "We Respond to Every Lead", desc: "Every person who fills out your form gets a text within 60 seconds. Then 4 more follow-ups over 14 days." },
  { num: "03", icon: BarChart2, title: "You See the Results", desc: "Log in to your dashboard. See every lead, every response, every booking. Know exactly what your radio campaign earned." },
];

const TIERS = [
  {
    label: "Starter", price: 497, period: "/mo",
    pitch: "We text every lead within 60 seconds",
    features: ["1 radio campaign — we write the script", "Every lead gets an instant text back", "See every lead in your dashboard", "Know who called, who booked, who bought", "Weekly email showing your results"],
  },
  {
    label: "Growth", price: 1497, period: "/mo", popular: true,
    pitch: "We handle everything — you just check your leads",
    features: ["Everything in Starter, plus:", "We build your landing page", "We set up and manage your Meta ads", "5 automatic follow-ups per lead over 14 days", "Monthly performance call with your strategist", "ROI reporting — see exactly what your campaign earned"],
  },
  {
    label: "Scale", price: 2997, period: "/mo",
    pitch: "Multiple campaigns — we optimize what works",
    features: ["Everything in Growth, plus:", "Run 2+ campaigns at the same time", "We A/B test ads and landing pages", "Advanced reporting with source attribution", "Dedicated monthly strategy session", "Priority support — same-day response"],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">

      {/* ── NAV ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Rocket Radio" className="h-9 w-9 rounded-xl" />
            <span className="text-base font-bold text-white">Rocket Radio</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/get-started"
              className="glass-gold hidden sm:inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-[#D4A853] transition-all hover:shadow-lg hover:shadow-[#D4A853]/10 active:scale-[0.98]"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-24 md:py-36 glow-gold dot-grid">
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#D4A853]">
              Federated Media &middot; 95.3 MNC
            </p>
            <h1 className="mt-6 font-serif text-5xl font-black leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
              Turn radio listeners into{" "}
              <span className="text-gradient-gold">paying customers</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/40 max-w-xl md:text-xl">
              We create your radio campaign, build your landing page, and text every lead
              within 60 seconds. You just check your dashboard.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/get-started"
                className="glass-gold inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-bold text-[#D4A853] shadow-lg shadow-[#D4A853]/10 transition-all hover:shadow-xl hover:shadow-[#D4A853]/20 active:scale-[0.98]"
              >
                Get Your Free Campaign Preview <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how-it-works"
                className="glass inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white/60 transition-all hover:text-white hover:bg-white/5"
              >
                See How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className="border-y border-white/5">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {[
            { value: 60, suffix: "sec", label: "Lead response time" },
            { value: 80, suffix: "+", label: "Leads per month" },
            { value: 5, suffix: "x", label: "Average client ROI", decimals: 0 },
            { value: 50, suffix: "K+", label: "Listeners reached" },
          ].map((s, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="px-6 py-10 text-center border-r border-white/5 last:border-0">
                <p className="text-4xl md:text-5xl font-bold text-white">
                  <AnimatedNumber value={s.value} decimals={s.decimals ?? 0} />
                  <span className="text-[#D4A853]">{s.suffix}</span>
                </p>
                <p className="mt-2 text-sm text-white/30">{s.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────── */}
      <ScrollReveal>
        <section className="px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">The Problem</p>
            <h2 className="mt-6 font-serif text-3xl font-bold text-white md:text-5xl leading-tight">
              You spend money on advertising. Can you prove it works?
            </h2>
            <p className="mt-6 text-lg text-white/30 leading-relaxed max-w-2xl mx-auto">
              Most local businesses run radio ads and hope for the best. Leads call but nobody tracks them.
              Follow-up is slow. The competitor who responds first wins the job.
            </p>
            <ScrollReveal delay={200}>
              <div className="mt-12 inline-flex items-center gap-6 glass rounded-2xl px-10 py-8">
                <span className="text-6xl md:text-7xl font-bold text-white">73<span className="text-[#D4A853]">%</span></span>
                <span className="text-left text-sm text-white/40 max-w-[220px] leading-snug">
                  of leads go to the business that responds within 5 minutes
                </span>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </ScrollReveal>

      {/* ── THE SOLUTION ─────────────────────────────────────── */}
      <section className="px-6 py-24 md:py-32 glow-gold">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">The Solution</p>
              <h2 className="mt-6 font-serif text-3xl font-bold text-white md:text-5xl leading-tight">
                The 4-Part Revenue System
              </h2>
              <p className="mt-4 text-lg text-white/30 max-w-2xl mx-auto">
                Radio drives awareness. Your landing page captures interest.
                Instant follow-up converts. Your dashboard proves the ROI.
              </p>
            </div>
          </ScrollReveal>
          <div className="mt-16 grid gap-6 md:grid-cols-4">
            {[
              { icon: Radio, label: "Radio Drives\nAwareness", sub: "Your 30-second spot on 95.3 MNC reaches 50,000+ listeners" },
              { icon: Globe, label: "Landing Page\nCaptures Interest", sub: "Every visitor sees your offer and fills out a simple form" },
              { icon: Zap, label: "Instant Follow-Up\nConverts", sub: "Text within 60 seconds + 4 more follow-ups over 14 days" },
              { icon: BarChart2, label: "Dashboard\nShows Results", sub: "See every lead, every response, every close in real time" },
            ].map((s, i) => (
              <ScrollReveal key={i} delay={i * 120}>
                <div className="glass rounded-2xl p-6 text-center transition-all hover:bg-white/[0.06] hover:border-white/10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A853]/10">
                    <s.icon className="h-6 w-6 text-[#D4A853]" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white whitespace-pre-line leading-snug">{s.label}</p>
                  <p className="mt-2 text-xs text-white/30 leading-relaxed">{s.sub}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">How It Works</p>
              <h2 className="mt-6 font-serif text-3xl font-bold text-white md:text-4xl">
                Three steps. Zero hassle.
              </h2>
            </div>
          </ScrollReveal>
          <div className="mt-16 space-y-0">
            {STEPS.map((step, i) => (
              <ScrollReveal key={i} delay={i * 150}>
                <div className="flex gap-6 md:gap-10 items-start py-10 border-b border-white/5 last:border-0">
                  <div className="shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass">
                      <step.icon className="h-6 w-6 text-[#D4A853]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4A853]">Step {step.num}</p>
                    <h3 className="mt-2 text-xl font-bold text-white md:text-2xl">{step.title}</h3>
                    <p className="mt-2 text-base text-white/30 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">Pricing</p>
              <h2 className="mt-6 font-serif text-3xl font-bold text-white md:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-3 text-base text-white/30">Month-to-month. No long-term contract. Cancel anytime.</p>
            </div>
          </ScrollReveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TIERS.map((t, i) => (
              <ScrollReveal key={t.label} delay={i * 100}>
                <div
                  className={`relative rounded-2xl p-8 transition-all hover:scale-[1.02] ${
                    t.popular
                      ? "glass-gold shadow-lg shadow-[#D4A853]/10"
                      : "glass"
                  }`}
                >
                  {t.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4A853] px-4 py-1 text-xs font-bold text-[#030712]">
                      Most Popular
                    </div>
                  )}
                  <p className="text-sm font-semibold text-white/50">{t.label}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">$<AnimatedNumber value={t.price} /></span>
                    <span className="text-base text-white/30">{t.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/30">{t.pitch}</p>
                  <div className="mt-6 space-y-3">
                    {t.features.map((f, j) => (
                      <div key={j} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#D4A853]" />
                        <span className="text-sm text-white/70">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/get-started"
                    className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${
                      t.popular
                        ? "glass-gold text-[#D4A853] hover:shadow-lg hover:shadow-[#D4A853]/10"
                        : "glass text-white/60 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <ScrollReveal>
        <section className="relative px-6 py-24 md:py-32 text-center glow-gold">
          <div className="relative z-10 mx-auto max-w-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-12 w-12 mx-auto mb-8 rounded-xl opacity-60" />
            <h2 className="font-serif text-3xl font-bold text-white md:text-5xl leading-tight">
              Ready to prove your radio works?
            </h2>
            <p className="mt-4 text-lg text-white/30">
              Get a free custom campaign preview — radio script, landing page, and ROI projection —
              built for your business in 48 hours.
            </p>
            <Link
              href="/get-started"
              className="mt-10 inline-flex items-center gap-2 glass-gold rounded-2xl px-10 py-4 text-base font-bold text-[#D4A853] shadow-lg shadow-[#D4A853]/10 transition-all hover:shadow-xl hover:shadow-[#D4A853]/20 active:scale-[0.98]"
            >
              Get Your Free Campaign Preview <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-white/20">
              <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> (260) 447-5511</span>
              <span className="hidden sm:block h-1 w-1 rounded-full bg-white/10" />
              <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> strategy@federatedmedia.com</span>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-5 w-5 rounded opacity-40" />
            <span className="text-sm font-semibold text-white/40">Rocket Radio</span>
            <span className="text-xs text-white/20">&middot; Powered by Federated Media</span>
          </div>
          <div className="flex gap-6 text-xs text-white/20">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
