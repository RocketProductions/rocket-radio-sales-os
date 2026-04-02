"use client";

import { useState } from "react";
import { Rocket, Loader2, CheckCircle2, Radio, Zap, BarChart2, Users } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rocket-bg via-white to-rocket-accent-bright/5 px-4">
        <div className="w-full max-w-md text-center animate-fade-in-up">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rocket-success-bright/10">
            <CheckCircle2 className="h-8 w-8 text-rocket-success" />
          </div>
          <h1 className="text-2xl font-bold text-rocket-dark">We&apos;re on it!</h1>
          <p className="mt-3 text-rocket-muted leading-relaxed">
            A Federated Media strategist will reach out within 24 hours with a
            custom campaign preview built specifically for <strong className="text-rocket-dark">{businessName}</strong>.
          </p>
          <p className="mt-6 text-sm text-rocket-muted">
            In the meantime, we&apos;re already analyzing your website and building your strategy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rocket-bg via-white to-rocket-accent-bright/5">
      {/* Header */}
      <header className="border-b border-rocket-border bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rocket-accent-bright/10">
              <Rocket className="h-4 w-4 text-rocket-accent" />
            </div>
            <span className="text-sm font-semibold text-rocket-dark">Rocket Radio</span>
          </div>
          <a href="/login" className="text-sm text-rocket-muted hover:text-rocket-dark transition-colors">
            Already a client? Sign in
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-start">

          {/* Left — value prop */}
          <div className="space-y-8 animate-fade-in-up">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-rocket-accent">
                More leads. Faster response. Proven ROI.
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight text-rocket-dark md:text-5xl">
                Turn radio listeners into paying customers
              </h1>
              <p className="mt-4 text-lg text-rocket-muted leading-relaxed">
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
                <div key={item.title} className="flex gap-3 rounded-xl border border-rocket-border bg-white p-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rocket-blue/10">
                    <item.icon className="h-4 w-4 text-rocket-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-rocket-dark">{item.title}</p>
                    <p className="mt-0.5 text-xs text-rocket-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-rocket-muted">
              Powered by <strong className="text-rocket-dark">Federated Media</strong> &middot; 95.3 MNC &middot; Fort Wayne, Indiana
            </p>
          </div>

          {/* Right — form */}
          <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-rocket-border bg-white p-8 shadow-lg shadow-slate-200/50 space-y-5"
            >
              <div>
                <h2 className="text-xl font-bold text-rocket-dark">Get your free campaign preview</h2>
                <p className="mt-1 text-sm text-rocket-muted">
                  Tell us about your business. A strategist will call you within 24 hours
                  with a custom radio campaign, landing page, and ROI projection — ready to go.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-rocket-dark">
                  Business Name <span className="text-rocket-danger">*</span>
                </label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Rocky Road Roofing"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-rocket-dark">
                  Website
                </label>
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rocket-dark">
                    Your Name
                  </label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="First and last"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rocket-dark">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(574) 555-0100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-rocket-dark">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-rocket-dark">
                  How did you hear about us?
                </label>
                <select
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-rocket-border bg-white px-3.5 py-2 text-sm transition-colors duration-150 hover:border-rocket-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rocket-blue focus-visible:ring-offset-2"
                >
                  <option value="">Select one...</option>
                  {REFERRAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
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

              <p className="text-center text-xs text-rocket-muted leading-relaxed">
                No obligation. No credit card. A real person will call you.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
