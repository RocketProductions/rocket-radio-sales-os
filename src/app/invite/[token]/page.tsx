"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface InviteDetails {
  email: string;
  role: string;
  organization: { id: string; name: string; org_type: string } | null;
  commission_rate_pct: number | null;
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/team/invite/${token}`);
        const json = await res.json();
        if (!json.ok) {
          setError(json.error ?? "Invalid invite");
        } else {
          setInvite(json.data);
        }
      } catch {
        setError("Failed to load invite details");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/team/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setSubmitError(json.error ?? "Failed to accept invite");
      } else {
        router.push("/login");
      }
    } catch {
      setSubmitError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rocket-bg">
        <p className="text-rocket-muted">Loading invite...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rocket-bg px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg text-center">Invite Invalid</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-rocket-muted">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-rocket-bg px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg text-center">Accept Your Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite details */}
          <div className="rounded-lg border border-rocket-border bg-rocket-bg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-rocket-muted">Organization</span>
              <span className="text-sm font-medium text-rocket-dark">{invite?.organization?.name ?? "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-rocket-muted">Role</span>
              <Badge variant="secondary">{invite?.role}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-rocket-muted">Email</span>
              <span className="text-sm text-rocket-dark">{invite?.email}</span>
            </div>
            {invite?.commission_rate_pct != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-rocket-muted">Commission Rate</span>
                <span className="text-sm text-rocket-dark">{invite.commission_rate_pct}%</span>
              </div>
            )}
          </div>

          {/* Signup form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-rocket-dark mb-1">
                Full Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-rocket-dark mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Accepting..." : "Accept Invite & Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
