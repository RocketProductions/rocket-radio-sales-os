"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Radio, Zap, BarChart2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const REFERRAL_OPTIONS = [
  "Radio ad (95.3 MNC)",
  "Facebook / Instagram",
  "Google search",
  "Referred by someone",
  "Other",
];

export default function GetStartedPage() {
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) { setError("Business name is required."); return; }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/get-started", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, website, phone, contactName, email, referral }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Something went wrong");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] px-4 glow-gold">
        <div className="w-full max-w-lg text-center animate-fade-in-up">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D4A853]/10">
            <CheckCircle2 className="h-8 w-8 text-[#D4A853]" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white md:text-4xl">We&apos;re building your campaign</h1>
          <p className="mt-4 text-white/40 leading-relaxed">
            A custom campaign preview for <strong className="text-white">{businessName}</strong> is in progress.
          </p>

          {/* What happens next — 3-step timeline */}
          <div className="mt-10 space-y-0 text-left">
            {[
              { num: "1", title: "Analyzing your website", sub: "Happening right now", active: true },
              { num: "2", title: "Building your campaign preview", sub: "Radio script, landing page, and ROI projection" },
              { num: "3", title: "A strategist calls you", sub: "Within 24 hours to walk you through everything" },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 py-4">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  step.active ? "bg-[#D4A853] text-[#030712] animate-pulse" : "bg-white/5 text-white/40"
                }`}>
                  {step.num}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${step.active ? "text-white" : "text-white/60"}`}>{step.title}</p>
                  <p className="text-xs text-white/30 mt-0.5">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact + back */}
          <div className="mt-10 glass rounded-xl px-6 py-4 text-center">
            <p className="text-sm text-white/40">Questions? Call us anytime</p>
            <a href="tel:2604475511" className="text-lg font-bold text-white hover:text-[#D4A853] transition-colors">(260) 447-5511</a>
          </div>

          {email && (
            <p className="mt-6 text-xs text-white/20">
              We sent a confirmation to {email}
            </p>
          )}

          <Link href="/" className="mt-6 inline-block text-sm text-white/30 hover:text-white/60 transition-colors">
            &larr; Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Rocket Radio" className="h-8 w-8 rounded-xl" />
            <span className="text-sm font-semibold text-white">Rocket Radio</span>
          </div>
          <a href="/login" className="text-sm text-white/40 hover:text-white transition-colors">
            Already a client? Sign in
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-start">

          {/* Left — value prop */}
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[#D4A853]">
                More leads. Faster response. Proven ROI.
              </p>
              <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
                Turn radio listeners into paying customers
              </h1>
              <p className="mt-4 text-lg text-white/40 leading-relaxed">
                We create your radio campaign, build your landing page, and text every lead
                within 60 seconds. You just check your dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Radio, title: "Radio campaign", desc: "We write and produce your 30-second spot" },
                { icon: Zap, title: "Instant follow-up", desc: "Every lead gets a text within 60 seconds" },
                { icon: Users, title: "Landing page", desc: "Built for you — captures every interested visitor" },
                { icon: BarChart2, title: "ROI dashboard", desc: "See every lead, every response, every close" },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 rounded-xl glass p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rocket-blue/10">
                    <item.icon className="h-4 w-4 text-rocket-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/40">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-white/20">
              Powered by <strong className="text-white/40">Federated Media</strong> &middot; 95.3 MNC &middot; Fort Wayne, Indiana
            </p>
          </div>

          {/* Right — form */}
          <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl glass p-8 space-y-5"
            >
              <div>
                <h2 className="text-xl font-bold text-white">Get your free campaign preview</h2>
                <p className="mt-1 text-sm text-white/40">
                  Tell us about your business. A strategist will call you within 24 hours
                  with a custom radio campaign, landing page, and ROI projection — ready to go.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Business Name <span className="text-rocket-danger">*</span>
                </label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Rocky Road Roofing"
                  required
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30 hover:border-white/20 focus-visible:ring-[#D4A853] focus-visible:ring-offset-[#030712]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Website
                </label>
                <Input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="yourwebsite.com"
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30 hover:border-white/20 focus-visible:ring-[#D4A853] focus-visible:ring-offset-[#030712]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/80">
                    Your Name
                  </label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="First and last"
                    className="bg-white/10 border-white/10 text-white placeholder:text-white/30 hover:border-white/20 focus-visible:ring-[#D4A853] focus-visible:ring-offset-[#030712]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/80">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(574) 555-0100"
                    className="bg-white/10 border-white/10 text-white placeholder:text-white/30 hover:border-white/20 focus-visible:ring-[#D4A853] focus-visible:ring-offset-[#030712]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30 hover:border-white/20 focus-visible:ring-[#D4A853] focus-visible:ring-offset-[#030712]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  How did you hear about us?
                </label>
                <select
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-white/10 bg-white/10 px-3.5 py-2 text-sm text-white transition-colors duration-150 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]"
                >
                  <option value="" className="bg-[#0B1D3A] text-white">Select one...</option>
                  {REFERRAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#0B1D3A] text-white">{opt}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Get My Free Campaign Preview"
                )}
              </Button>

              <p className="text-center text-xs text-white/40 leading-relaxed">
                No obligation. No credit card. A real person will call you.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
