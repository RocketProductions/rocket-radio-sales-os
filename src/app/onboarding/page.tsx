"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Check, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tier = "starter" | "growth" | "scale";
type Step = 1 | 2 | 3;

const TIERS: { value: Tier; label: string; price: string; pitch: string; features: string[] }[] = [
  {
    value: "starter",
    label: "Starter",
    price: "$497/mo",
    pitch: "Perfect for your first campaign",
    features: [
      "\"Your Leads\" dashboard",
      "1 campaign setup",
      "Instant text to every lead",
      "Activity feed",
      "Status tracking",
    ],
  },
  {
    value: "growth",
    label: "Growth",
    price: "$1,497/mo",
    pitch: "For businesses ready to grow",
    features: [
      "Everything in Starter",
      "Ongoing campaign management",
      "5-touch follow-up per lead",
      "Meta ad setup + landing page",
      "Monthly performance review",
    ],
  },
  {
    value: "scale",
    label: "Scale",
    price: "$2,997/mo",
    pitch: "For businesses that never miss a lead",
    features: [
      "Everything in Growth",
      "Multiple simultaneous campaigns",
      "A/B testing",
      "Advanced reporting",
      "Dedicated strategy monthly",
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Business info
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");

  // Step 2 — Tier selection
  const [tier, setTier] = useState<Tier>("starter");

  // Step 3 — Account creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (step === 1) {
      if (!businessName.trim()) { setError("Business name is required."); return; }
      setError("");
      setStep(2);
      return;
    }

    if (step === 2) {
      setError("");
      setStep(3);
      return;
    }

    // Step 3 — final submit
    if (!email || !password) { setError("Email and password are required."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, industry, website, email, password, tier }),
      });

      const data = await res.json() as { ok: boolean; error?: string; checkoutUrl?: string; mode?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      // Redirect to Stripe checkout, or direct to dashboard in stub mode
      if (data.mode === "stub" || !data.checkoutUrl || data.checkoutUrl.includes("stub=true")) {
        router.push("/dashboard?onboarding=complete");
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels = ["Business Info", "Choose Plan", "Create Account"];

  return (
    <div className="flex min-h-screen flex-col bg-rocket-bg">
      {/* Header */}
      <header className="border-b border-rocket-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-rocket-accent" />
            <span className="font-bold text-rocket-dark">Rocket Radio</span>
          </div>
          <a href="/login" className="text-sm text-rocket-muted hover:text-rocket-dark">
            Already have an account? Sign in
          </a>
        </div>
      </header>

      {/* Step indicator */}
      <div className="border-b border-rocket-border bg-white py-4">
        <div className="mx-auto max-w-2xl px-6">
          <div className="flex items-center gap-0">
            {stepLabels.map((label, i) => {
              const n = (i + 1) as Step;
              const isComplete = step > n;
              const isActive = step === n;
              return (
                <div key={label} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        isComplete
                          ? "bg-rocket-success text-white"
                          : isActive
                            ? "bg-rocket-accent text-white"
                            : "bg-rocket-border text-rocket-muted"
                      }`}
                    >
                      {isComplete ? <Check className="h-3.5 w-3.5" /> : n}
                    </div>
                    <span
                      className={`text-sm ${
                        isActive ? "font-medium text-rocket-dark" : "text-rocket-muted"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className="mx-4 h-px w-12 bg-rocket-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <form onSubmit={handleSubmit}>

          {/* ─── Step 1: Business Info ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-rocket-dark">Tell us about your business</h1>
                <p className="mt-1 text-rocket-muted">
                  We use this to build your campaign and customize your dashboard.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-rocket-border bg-white p-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Business Name <span className="text-rocket-danger">*</span></label>
                  <Input
                    placeholder="e.g. Rocky Road Roofing"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Industry</label>
                  <Input
                    placeholder="e.g. Roofing, HVAC, Auto Dealer, Dentist"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Website</label>
                  <Input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ─── Step 2: Tier Selection ────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-rocket-dark">Choose your plan</h1>
                <p className="mt-1 text-rocket-muted">
                  Month-to-month. No long-term contract. Cancel anytime.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {TIERS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTier(t.value)}
                    className={`rounded-xl border p-5 text-left transition-all ${
                      tier === t.value
                        ? "border-rocket-accent bg-rocket-accent/5 ring-2 ring-rocket-accent"
                        : "border-rocket-border bg-white hover:border-rocket-muted"
                    }`}
                  >
                    <p className="font-semibold text-rocket-dark">{t.label}</p>
                    <p className="mt-1 text-2xl font-bold text-rocket-accent">{t.price}</p>
                    <p className="mt-1 text-xs text-rocket-muted">{t.pitch}</p>
                    <ul className="mt-4 space-y-1.5">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-rocket-dark">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-rocket-success" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Account Creation ──────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-rocket-dark">Create your account</h1>
                <p className="mt-1 text-rocket-muted">
                  You will be redirected to complete payment after this step.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-rocket-border bg-white p-6">
                {/* Summary */}
                <div className="rounded-md bg-rocket-bg p-3 text-sm">
                  <span className="font-medium text-rocket-dark">{businessName}</span>
                  <span className="mx-2 text-rocket-muted">·</span>
                  <span className="capitalize text-rocket-muted">
                    {TIERS.find((t) => t.value === tier)?.label} —{" "}
                    {TIERS.find((t) => t.value === tier)?.price}
                  </span>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email <span className="text-rocket-danger">*</span></label>
                  <Input
                    type="email"
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Password <span className="text-rocket-danger">*</span></label>
                  <Input
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Confirm Password <span className="text-rocket-danger">*</span></label>
                  <Input
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</>
                  ) : (
                    <>Continue to payment <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-rocket-muted">
                Your payment is processed securely by Stripe. We never store card details.
              </p>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
