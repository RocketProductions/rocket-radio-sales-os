"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as { ok: boolean; error?: string; data?: { user: { role: string } } };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      const role = data.data?.user.role ?? "";
      const isInternalUser = ["admin", "manager", "executive", "rep", "super_admin"].includes(role);

      if (next !== "/dashboard" && !next.startsWith("/dashboard")) {
        router.push(next);
      } else {
        router.push(isInternalUser ? "/dashboard" : "/portal");
      }
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rocket-bg via-white to-rocket-accent-bright/5 px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rocket-accent-bright/10 shadow-sm">
            <Rocket className="h-6 w-6 text-rocket-accent-bright" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-rocket-dark">Rocket Radio</h1>
            <p className="mt-1 text-sm text-rocket-muted">Sign in to your account</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-rocket-border bg-white p-8 shadow-lg shadow-slate-200/50"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rocket-dark">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-rocket-dark">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
              <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-rocket-muted">
          Reps:{" "}
          <a href="/onboarding" className="font-medium text-rocket-blue hover:underline">
            Set up a new client account
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
