"use client";

import { useState } from "react";
import { FileText, StickyNote, Trash2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadedAsset } from "@/types/assets";

const CATEGORY_LABELS: Record<UploadedAsset["category"], string> = {
  logo: "Logo",
  photo: "Photo",
  document: "Document",
  note: "Note",
};

const CATEGORY_COLORS: Record<UploadedAsset["category"], string> = {
  logo: "bg-purple-100 text-purple-700",
  photo: "bg-blue-100 text-blue-700",
  document: "bg-amber-100 text-amber-700",
  note: "bg-green-100 text-green-700",
};

interface AssetCardProps {
  asset: UploadedAsset;
  onDelete: (id: string) => void;
}

export function AssetCard({ asset, onDelete }: AssetCardProps) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const isImage = asset.category === "logo" || asset.category === "photo";

  return (
    <div
      className="relative rounded-xl shadow-sm border border-slate-100 bg-white overflow-hidden group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={cn(
          "absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white shadow border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-all",
          hovered ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-label="Delete asset"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Thumbnail area */}
      <div className="aspect-square flex items-center justify-center bg-slate-50 overflow-hidden">
        {isImage && asset.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.signedUrl}
            alt={asset.original_name}
            className="w-full h-full object-contain"
          />
        ) : asset.category === "document" ? (
          <FileText className="h-10 w-10 text-amber-400" />
        ) : asset.category === "note" ? (
          <StickyNote className="h-10 w-10 text-green-400" />
        ) : (
          <ImageIcon className="h-10 w-10 text-slate-300" />
        )}
      </div>

      {/* Card footer */}
      <div className="p-3 space-y-1">
        <p className="text-xs font-medium text-rocket-dark truncate" title={asset.original_name}>
          {asset.category === "note"
            ? asset.file_name
            : asset.original_name}
        </p>

        {asset.category === "note" && asset.note_content && (
          <p className="text-xs text-rocket-muted line-clamp-2">
            {asset.note_content.slice(0, 80)}
            {asset.note_content.length > 80 ? "…" : ""}
          </p>
        )}

        <div className="flex items-center justify-between pt-0.5">
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              CATEGORY_COLORS[asset.category]
            )}
          >
            {CATEGORY_LABELS[asset.category]}
          </span>

          {asset.category !== "note" && (
            <span className="text-[10px] text-rocket-muted">
              {(asset.file_size / 1024).toFixed(0)} KB
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
