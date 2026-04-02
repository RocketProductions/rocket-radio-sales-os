"use client";

import { useState, useCallback } from "react";
import { Building2, ChevronDown, ChevronRight, Landmark, Plus, FolderOpen, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadDropZone } from "./UploadDropZone";
import { AddNoteModal } from "./AddNoteModal";
import { AdminAssetCard } from "./AdminAssetCard";
import type { UploadedAsset } from "@/types/assets";

interface ClientInfo {
  sessionId: string;
  businessName: string;
}

interface Props {
  initialAssets: UploadedAsset[];
  tenantId: string;
  clients?: ClientInfo[];
}

type CategoryFilter = "all" | "logo" | "photo" | "document" | "note";

const FILTER_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "logo",     label: "Logos" },
  { value: "photo",    label: "Photos" },
  { value: "document", label: "Documents" },
  { value: "note",     label: "Notes" },
];

export function AdminAssetLibrary({ initialAssets, clients }: Props) {
  const [assets, setAssets]               = useState<UploadedAsset[]>(initialAssets);
  const [category, setCategory]           = useState<CategoryFilter>("all");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTarget, setNoteTarget]       = useState<{ sessionId?: string; ownerType: "client" | "agency" }>({ ownerType: "agency" });
  // Track which client sections are collapsed
  const [collapsed, setCollapsed]         = useState<Record<string, boolean>>({});

  // ── Derived lists ─────────────────────────────────────────────────────────────
  function filterByCategory(list: UploadedAsset[]) {
    return category === "all" ? list : list.filter((a) => a.category === category);
  }

  const agencyAssets = filterByCategory(assets.filter((a) => a.owner_type === "agency"));

  // Group client assets by business name
  const clientGroups: { sessionId: string; businessName: string; items: UploadedAsset[] }[] = [];
  const clientAssets = assets.filter((a) => a.owner_type === "client");
  const seenSessions = new Set<string>();

  for (const asset of clientAssets) {
    const sid = asset.session_id ?? "__no_session__";
    if (!seenSessions.has(sid)) {
      seenSessions.add(sid);
      clientGroups.push({
        sessionId:    sid,
        businessName: asset.business_name ?? "Unknown Client",
        items:        [],
      });
    }
    const group = clientGroups.find((g) => g.sessionId === sid);
    if (group) group.items.push(asset);
  }

  // Add empty groups for clients that have no assets yet
  if (clients) {
    for (const client of clients) {
      if (!seenSessions.has(client.sessionId)) {
        seenSessions.add(client.sessionId);
        clientGroups.push({
          sessionId:    client.sessionId,
          businessName: client.businessName,
          items:        [],
        });
      }
    }
  }

  // Apply category filter to each group
  const filteredGroups = clientGroups
    .map((g) => ({ ...g, items: filterByCategory(g.items) }))
    .filter((g) => category === "all" || g.items.length > 0);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  function handleUploaded(asset: UploadedAsset) {
    setAssets((prev) => [asset, ...prev]);
  }

  function handleDelete(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  function handleNoteSaved(asset: UploadedAsset) {
    setAssets((prev) => [asset, ...prev]);
  }

  const handlePromote = useCallback(async (id: string) => {
    const res = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_type: "agency" }),
    });
    if (res.ok) {
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, owner_type: "agency" } : a))
      );
    }
  }, []);

  const handleDemote = useCallback(async (id: string) => {
    const res = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_type: "client" }),
    });
    if (res.ok) {
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, owner_type: "client" } : a))
      );
    }
  }, []);

  function toggleCollapsed(sessionId: string) {
    setCollapsed((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
  }

  function openNoteModal(opts: { sessionId?: string; ownerType: "client" | "agency" }) {
    setNoteTarget(opts);
    setShowNoteModal(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Category filter */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === "all"
            ? assets.length
            : assets.filter((a) => a.category === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setCategory(tab.value)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                category === tab.value
                  ? "border-rocket-blue text-rocket-blue"
                  : "border-transparent text-rocket-muted hover:text-rocket-dark"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  category === tab.value
                    ? "bg-rocket-blue/10 text-rocket-blue"
                    : "bg-slate-100 text-slate-500"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Agency Assets ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-rocket-accent" />
            <h2 className="font-semibold text-rocket-dark">Agency Assets</h2>
            <Badge variant="secondary" className="text-xs">{agencyAssets.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {category !== "note" && (
              <UploadDropZone
                onUploaded={handleUploaded}
                ownerType="agency"
                compact
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openNoteModal({ ownerType: "agency" })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Note
            </Button>
          </div>
        </div>

        <p className="text-xs text-rocket-muted -mt-2">
          Templates, marketing materials, and client assets promoted for agency use.
        </p>

        {agencyAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-rocket-border py-10 text-center">
            <Landmark className="h-8 w-8 text-rocket-border mb-2" />
            <p className="text-sm text-rocket-muted">No agency assets yet.</p>
            <p className="text-xs text-rocket-muted mt-0.5">
              Upload here or promote a client asset using the ↑ button.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {agencyAssets.map((asset) => (
              <AdminAssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDelete}
                onDemote={handleDemote}
                isAgency
              />
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-rocket-border" />

      {/* ── Client Assets (grouped) ──────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-rocket-blue" />
          <h2 className="font-semibold text-rocket-dark">Client Assets</h2>
          <Badge variant="secondary" className="text-xs">
            {clientAssets.length}
          </Badge>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FolderOpen className="h-10 w-10 text-rocket-border mb-3" />
            <p className="text-sm text-rocket-muted">No client assets yet.</p>
            <p className="text-xs text-rocket-muted mt-0.5">
              Assets are added when you run the campaign wizard for a client.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((group) => {
              const isCollapsed = collapsed[group.sessionId] ?? false;
              return (
                <div
                  key={group.sessionId}
                  className="rounded-lg border border-rocket-border overflow-hidden"
                >
                  {/* Group header */}
                  <button
                    onClick={() => toggleCollapsed(group.sessionId)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-rocket-bg hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed
                        ? <ChevronRight className="h-4 w-4 text-rocket-muted" />
                        : <ChevronDown className="h-4 w-4 text-rocket-muted" />
                      }
                      <span className="font-medium text-sm text-rocket-dark">
                        {group.businessName}
                      </span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {group.items.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {category !== "note" && (
                        <UploadDropZone
                          onUploaded={handleUploaded}
                          sessionId={group.sessionId === "__no_session__" ? undefined : group.sessionId}
                          ownerType="client"
                          compact
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openNoteModal({
                          sessionId: group.sessionId === "__no_session__" ? undefined : group.sessionId,
                          ownerType: "client",
                        })}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Note
                      </Button>
                    </div>
                  </button>

                  {/* Asset grid */}
                  {!isCollapsed && (
                    <div className="p-4">
                      {group.items.length === 0 ? (
                        <div className="py-6 text-center">
                          <UploadCloud className="mx-auto h-8 w-8 text-rocket-border mb-2" />
                          <p className="text-sm text-rocket-muted">
                            No assets yet for {group.businessName}
                          </p>
                          <div className="mt-3 inline-block">
                            <UploadDropZone
                              onUploaded={handleUploaded}
                              sessionId={group.sessionId === "__no_session__" ? undefined : group.sessionId}
                              ownerType="client"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {group.items.map((asset) => (
                            <AdminAssetCard
                              key={asset.id}
                              asset={asset}
                              onDelete={handleDelete}
                              onPromote={handlePromote}
                              isAgency={false}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AddNoteModal
        open={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSaved={handleNoteSaved}
        sessionId={noteTarget.sessionId}
        ownerType={noteTarget.ownerType}
      />
    </div>
  );
}
