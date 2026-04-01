"use client";

import { useEffect, useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UploadDropZone } from "./UploadDropZone";
import { AssetCard } from "./AssetCard";
import { AddNoteModal } from "./AddNoteModal";
import type { UploadedAsset } from "@/types/assets";

type CategoryFilter = "all" | "logo" | "photo" | "document" | "note";

const FILTER_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "logo", label: "Logos" },
  { value: "photo", label: "Photos" },
  { value: "document", label: "Documents" },
  { value: "note", label: "Notes" },
];

const EMPTY_MESSAGES: Record<CategoryFilter, string> = {
  all: "No assets yet. Upload files or add a note to get started.",
  logo: "No logos uploaded yet.",
  photo: "No photos uploaded yet.",
  document: "No documents uploaded yet.",
  note: "No notes yet. Click \"Add Note\" to create one.",
};

interface AssetLibraryProps {
  tenantId?: string;
  sessionId?: string;
}

export function AssetLibrary({ tenantId, sessionId }: AssetLibraryProps) {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function loadAssets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (sessionId) params.set("sessionId", sessionId);

      const res = await fetch(`/api/assets?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setAssets(json.assets as UploadedAsset[]);
      }
    } catch (err) {
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleUploaded(asset: UploadedAsset) {
    setAssets((prev) => [asset, ...prev]);
  }

  function handleDelete(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  function handleNoteSaved(asset: UploadedAsset) {
    setAssets((prev) => [asset, ...prev]);
  }

  const filteredAssets =
    activeCategory === "all"
      ? assets
      : assets.filter((a) => a.category === activeCategory);

  function countFor(category: CategoryFilter) {
    if (category === "all") return assets.length;
    return assets.filter((a) => a.category === category).length;
  }

  return (
    <div className="space-y-6">
      {/* Category filter tabs + Add Note button */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => {
            const count = countFor(tab.value);
            return (
              <button
                key={tab.value}
                onClick={() => setActiveCategory(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeCategory === tab.value
                    ? "border-rocket-blue text-rocket-blue"
                    : "border-transparent text-rocket-muted hover:text-rocket-dark"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                      activeCategory === tab.value
                        ? "bg-rocket-blue/10 text-rocket-blue"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNoteModal(true)}
          className="mb-2"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      </div>

      {/* Upload zone — hidden on Notes tab */}
      {activeCategory !== "note" && (
        <UploadDropZone onUploaded={handleUploaded} sessionId={sessionId} />
      )}

      {/* Notes tab gets its own CTA */}
      {activeCategory === "note" && (
        <div className="flex justify-start">
          <Button onClick={() => setShowNoteModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      )}

      {/* Asset grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-100 animate-pulse aspect-square"
            />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm text-rocket-muted">{EMPTY_MESSAGES[activeCategory]}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AddNoteModal
        open={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSaved={handleNoteSaved}
        sessionId={sessionId}
      />
    </div>
  );
}
