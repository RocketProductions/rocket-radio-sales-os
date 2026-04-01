"use client";

import { useState } from "react";
import { FileText, StickyNote, Trash2, Image as ImageIcon, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadedAsset } from "@/types/assets";

const CATEGORY_LABELS: Record<UploadedAsset["category"], string> = {
  logo:     "Logo",
  photo:    "Photo",
  document: "Document",
  note:     "Note",
};

const CATEGORY_COLORS: Record<UploadedAsset["category"], string> = {
  logo:     "bg-purple-100 text-purple-700",
  photo:    "bg-blue-100 text-blue-700",
  document: "bg-amber-100 text-amber-700",
  note:     "bg-green-100 text-green-700",
};

interface AdminAssetCardProps {
  asset: UploadedAsset;
  isAgency: boolean;
  onDelete:  (id: string) => void;
  onPromote?: (id: string) => Promise<void>;
  onDemote?:  (id: string) => Promise<void>;
}

export function AdminAssetCard({ asset, isAgency, onDelete, onPromote, onDemote }: AdminAssetCardProps) {
  const [hovered,    setHovered]    = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [promoting,  setPromoting]  = useState(false);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      onDelete(asset.id);
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
    }
  }

  async function handlePromote() {
    if (promoting || !onPromote) return;
    setPromoting(true);
    try { await onPromote(asset.id); } finally { setPromoting(false); }
  }

  async function handleDemote() {
    if (promoting || !onDemote) return;
    setPromoting(true);
    try { await onDemote(asset.id); } finally { setPromoting(false); }
  }

  const isImage = asset.category === "logo" || asset.category === "photo";

  return (
    <div
      className="relative rounded-xl shadow-sm border border-slate-100 bg-white overflow-hidden group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Action buttons — appear on hover */}
      <div className={cn(
        "absolute top-2 right-2 z-10 flex gap-1 transition-all",
        hovered ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {/* Promote to Agency / Return to Client */}
        {isAgency && onDemote ? (
          <button
            onClick={handleDemote}
            disabled={promoting}
            title="Return to client"
            className="p-1.5 rounded-lg bg-white shadow border border-slate-200 text-slate-500 hover:text-rocket-blue hover:border-rocket-blue/30 transition-all"
          >
            {promoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
          </button>
        ) : !isAgency && onPromote ? (
          <button
            onClick={handlePromote}
            disabled={promoting}
            title="Promote to Agency Assets"
            className="p-1.5 rounded-lg bg-white shadow border border-slate-200 text-slate-500 hover:text-rocket-accent hover:border-rocket-accent/30 transition-all"
          >
            {promoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}
          </button>
        ) : null}

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete asset"
          className="p-1.5 rounded-lg bg-white shadow border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-all"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Thumbnail */}
      <div className="aspect-square flex items-center justify-center bg-slate-50 overflow-hidden">
        {isImage && asset.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.signedUrl} alt={asset.original_name} className="w-full h-full object-contain" />
        ) : asset.category === "document" ? (
          <FileText className="h-10 w-10 text-amber-400" />
        ) : asset.category === "note" ? (
          <StickyNote className="h-10 w-10 text-green-400" />
        ) : (
          <ImageIcon className="h-10 w-10 text-slate-300" />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 space-y-1">
        <p className="text-xs font-medium text-rocket-dark truncate" title={asset.original_name}>
          {asset.category === "note" ? asset.file_name : asset.original_name}
        </p>

        {asset.category === "note" && asset.note_content && (
          <p className="text-xs text-rocket-muted line-clamp-2">
            {asset.note_content.slice(0, 80)}{asset.note_content.length > 80 ? "…" : ""}
          </p>
        )}

        <div className="flex items-center justify-between pt-0.5">
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", CATEGORY_COLORS[asset.category])}>
            {CATEGORY_LABELS[asset.category]}
          </span>
          {asset.category !== "note" && (
            <span className="text-[10px] text-rocket-muted">
              {(asset.file_size / 1024).toFixed(0)} KB
            </span>
          )}
        </div>

        {/* Promote label hint */}
        {!isAgency && (
          <p className={cn(
            "text-[10px] text-rocket-accent font-medium transition-opacity",
            hovered ? "opacity-100" : "opacity-0"
          )}>
            ↑ Promote to agency
          </p>
        )}
        {isAgency && (
          <p className={cn(
            "text-[10px] text-rocket-blue font-medium transition-opacity",
            hovered ? "opacity-100" : "opacity-0"
          )}>
            ↓ Return to client
          </p>
        )}
      </div>
    </div>
  );
}
