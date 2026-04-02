"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Building2, Globe, ChevronDown, ChevronRight,
  Archive, Plus, Search, ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CampaignSession {
  id: string;
  session_id: string;
  user_id: string | null;
  tenant_id: string | null;
  user_email: string | null;
  business_name: string;
  brand_kit_id: string | null;
  lp_slug: string | null;
  lp_live: boolean;
  asset_count: number;
  status: string;
  created_at: string;
}

interface Props {
  sessions: CampaignSession[];
  userRole: string;
  planTier: string;
  brandCount: number;
  brandLimit: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

function statusBadge(status: string) {
  if (status === "archived") return <Badge variant="secondary">Archived</Badge>;
  return <Badge variant="success">Active</Badge>;
}

// ── Sub-component: single session row ────────────────────────────────────────

function SessionRow({
  session,
  onArchive,
}: {
  session: CampaignSession;
  onArchive: (sessionId: string) => void;
}) {
  const [archiving, setArchiving] = useState(false);

  async function handleArchive() {
    setArchiving(true);
    try {
      await fetch(`/api/campaigns/sessions/${session.session_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      onArchive(session.session_id);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2 px-3 rounded-md hover:bg-rocket-bg text-sm">
      <div className="flex items-center gap-3 min-w-0">
        {statusBadge(session.status)}
        <span className="text-rocket-muted shrink-0">{formatDate(session.created_at)}</span>
        {session.asset_count > 0 && (
          <span className="text-rocket-muted shrink-0">
            {session.asset_count} asset{session.asset_count !== 1 ? "s" : ""}
          </span>
        )}
        {session.user_email && (
          <span className="text-rocket-muted truncate hidden md:block">{session.user_email}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/dashboard/campaigns/new?session=${session.session_id}`}>
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-3 w-3" />
            Resume
          </Button>
        </Link>
        {session.status !== "archived" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArchive}
            disabled={archiving}
            className="text-rocket-muted hover:text-rocket-dark"
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: business card ──────────────────────────────────────────────

function BusinessCard({
  businessName,
  sessions,
  onArchive,
}: {
  businessName: string;
  sessions: CampaignSession[];
  onArchive: (sessionId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const liveSession = sessions.find((s) => s.lp_live && s.lp_slug);

  return (
    <Card className="border-rocket-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <button
          className="flex items-center justify-between w-full text-left gap-2"
          onClick={() => setOpen((o) => !o)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Building2 className="h-4 w-4 text-rocket-muted shrink-0" />
            <CardTitle className="text-base font-semibold truncate">{businessName}</CardTitle>
            {liveSession ? (
              <span className="flex items-center gap-1.5 text-xs text-rocket-success font-medium shrink-0">
                <span className="h-2 w-2 rounded-full bg-rocket-success-bright inline-block" />
                Live
                {liveSession.lp_slug && (
                  <a
                    href={`/lp/${liveSession.lp_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-0.5 text-rocket-muted hover:text-rocket-dark"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </span>
            ) : (
              <span className="text-xs text-rocket-muted shrink-0 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                No live page
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </Badge>
            {open
              ? <ChevronDown className="h-4 w-4 text-rocket-muted" />
              : <ChevronRight className="h-4 w-4 text-rocket-muted" />
            }
          </div>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="px-4 pb-4 pt-1">
          <div className="divide-y divide-rocket-border">
            {sessions.map((s) => (
              <SessionRow key={s.session_id} session={s} onArchive={onArchive} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CampaignsList({ sessions: initial, userRole, planTier, brandCount, brandLimit }: Props) {
  const [search, setSearch]         = useState("");
  const [sessions, setSessions]     = useState<CampaignSession[]>(initial);
  const isSuperAdmin                = userRole === "super_admin";
  const atLimit                     = brandCount >= brandLimit && brandLimit < 999;

  function handleArchive(sessionId: string) {
    setSessions((prev) =>
      prev.map((s) =>
        s.session_id === sessionId ? { ...s, status: "archived" } : s
      )
    );
  }

  // Filter
  const filtered = sessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.business_name.toLowerCase().includes(q) ||
      (s.tenant_id ?? "").toLowerCase().includes(q) ||
      (s.user_email ?? "").toLowerCase().includes(q)
    );
  });

  // Group by tenant (super_admin) then by business_name
  const byTenant: Record<string, CampaignSession[]> = {};
  for (const s of filtered) {
    const key = isSuperAdmin ? (s.tenant_id ?? "unknown") : "__single__";
    (byTenant[key] ??= []).push(s);
  }

  // Super admin aggregate counts
  const tenantCount   = isSuperAdmin ? Object.keys(byTenant).length : 0;
  const businessCount = isSuperAdmin
    ? new Set(filtered.map((s) => `${s.tenant_id}::${s.business_name.toLowerCase()}`)).size
    : 0;

  return (
    <div className="space-y-4">
      {/* Search (super_admin or large lists) */}
      {(isSuperAdmin || sessions.length > 5) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rocket-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isSuperAdmin ? "Search by business name, tenant ID, or email…" : "Search campaigns…"}
            className="w-full rounded-md border border-rocket-border bg-rocket-bg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
          />
        </div>
      )}

      {/* Super admin aggregate stats */}
      {isSuperAdmin && filtered.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-rocket-muted">
          <span><strong className="text-rocket-dark">{tenantCount}</strong> tenant{tenantCount !== 1 ? "s" : ""}</span>
          <span><strong className="text-rocket-dark">{businessCount}</strong> business{businessCount !== 1 ? "es" : ""}</span>
          <span><strong className="text-rocket-dark">{filtered.length}</strong> campaign{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Plan usage bar (non-super_admin) */}
      {!isSuperAdmin && (
        <div className="rounded-lg border border-rocket-border bg-rocket-bg px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-rocket-dark">
              {brandCount} of {brandLimit < 999 ? brandLimit : "∞"} brand{brandLimit !== 1 ? "s" : ""} used
            </span>
            {atLimit && (
              <a
                href="/dashboard/billing"
                className="text-xs font-medium text-rocket-accent hover:underline"
              >
                Upgrade plan
              </a>
            )}
          </div>
          {brandLimit < 999 && (
            <div className="h-1.5 w-full rounded-full bg-rocket-border overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  atLimit ? "bg-rocket-danger" : "bg-rocket-accent"
                )}
                style={{ width: `${Math.min((brandCount / brandLimit) * 100, 100)}%` }}
              />
            </div>
          )}
          {atLimit && (
            <p className="mt-1.5 text-xs text-rocket-muted">
              You&apos;re at your brand limit on the{" "}
              <span className="capitalize">{planTier}</span> plan.{" "}
              <a href="/dashboard/billing" className="text-rocket-accent hover:underline">
                Upgrade to add more brands.
              </a>
            </p>
          )}
        </div>
      )}

      {/* Tenant groups */}
      {Object.entries(byTenant).map(([tenantKey, tenantSessions]) => {
        // Group by business name within this tenant
        const byBusiness: Record<string, CampaignSession[]> = {};
        for (const s of tenantSessions) {
          (byBusiness[s.business_name] ??= []).push(s);
        }

        return (
          <div key={tenantKey} className="space-y-3">
            {/* Tenant header (super_admin only) */}
            {isSuperAdmin && tenantKey !== "__single__" && (
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-rocket-border" />
                <span className="text-xs font-mono text-rocket-muted px-2">
                  tenant: {tenantKey}
                </span>
                <div className="h-px flex-1 bg-rocket-border" />
              </div>
            )}

            {/* Business cards */}
            {Object.entries(byBusiness).map(([businessName, bSessions]) => (
              <BusinessCard
                key={`${tenantKey}::${businessName}`}
                businessName={businessName}
                sessions={bSessions}
                onArchive={handleArchive}
              />
            ))}
          </div>
        );
      })}

      {/* Empty filtered state */}
      {filtered.length === 0 && search && (
        <p className="text-center text-sm text-rocket-muted py-8">
          No campaigns match &ldquo;{search}&rdquo;.
        </p>
      )}
    </div>
  );
}
